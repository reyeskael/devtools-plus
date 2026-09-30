import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { seedMockResponses } from '../items/seedItems';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../storage/keys';
import type { MockResponseItem, PopupItem, RedirectRuleItem } from '../items/types';

interface StoredPopupItemsState {
	mockResponses: MockResponseItem[];
	redirects: RedirectRuleItem[];
	isRunning: boolean;
}

export interface ItemsStateContextValue {
	mockResponses: MockResponseItem[];
	redirects: RedirectRuleItem[];
	isRunning: boolean;
	/**
	 * Whether the initial `chrome.storage.local.get` load has completed (whether or not it found
	 * anything to hydrate). Callers that need to distinguish "no persisted data yet" from "still
	 * loading" — e.g. deciding whether an id genuinely doesn't exist — should gate on this rather
	 * than on `mockResponses`/`redirects` being non-empty.
	 */
	hasHydrated: boolean;
	setRunning: (running: boolean) => void;
	toggleItem: (kind: PopupItem['kind'], id: string) => void;
	removeItem: (kind: PopupItem['kind'], id: string) => void;
	replaceItems: (mockResponses?: MockResponseItem[], redirects?: RedirectRuleItem[]) => void;
	upsertMockResponse: (item: MockResponseItem) => void;
}

/**
 * Exported (rather than kept module-private) so tests can render a component tree against a
 * controlled `ItemsStateContextValue` value via `<ItemsStateContext.Provider value={...}>`, without
 * going through real `chrome.storage` hydration.
 */
export const ItemsStateContext = createContext<ItemsStateContextValue | null>(null);

/**
 * Owns the popup's `{ mockResponses, redirects, isRunning }` state, hydrating it from
 * `chrome.storage.local` on mount and persisting every subsequent change back to it — the
 * top of the popup → bridge → interceptor data flow described in the repo's CLAUDE.md.
 *
 * @returns The current items/running state plus mutators for toggling, removing, and
 * replacing items and for setting `isRunning`.
 */
const useItemsState = (): ItemsStateContextValue => {
	const [mockResponses, setMockResponses] = useState<MockResponseItem[]>(seedMockResponses);
	const [redirects, setRedirects] = useState<RedirectRuleItem[]>([]);
	const [isRunning, setIsRunning] = useState(true);
	const [hasHydrated, setHasHydrated] = useState(false);
	const hasHydratedRef = useRef(false);
	const lastWrittenPayloadRef = useRef<string | null>(null);

	/**
	 * Loads any persisted state once on mount. Until this resolves, the hook keeps rendering
	 * its in-memory defaults.
	 */
	useEffect(() => {
		chrome.storage.local.get(STORAGE_KEY, (result) => {
			const stored = result[STORAGE_KEY] as StoredPopupItemsState | undefined;
			if (stored) {
				setMockResponses(stored.mockResponses);
				// Storage written by a pre-rename build (or otherwise missing `redirects`)
				// has no `redirects` key at all — default it rather than crash later.
				setRedirects(stored.redirects ?? []);
				setIsRunning(stored.isRunning);
			}
			hasHydratedRef.current = true;
			setHasHydrated(true);
		});
	}, []);

	/**
	 * Writes a full state payload to storage immediately, at the point of mutation, rather than
	 * via a `useEffect` keyed on state — a mutate-then-navigate handler (e.g. the app's editor
	 * Save/Delete) can unmount this hook's owning component in the same commit as the state
	 * update, dropping a would-be effect before it runs. Also records the payload so the
	 * `onChanged` listener below can ignore the event this write itself fires.
	 *
	 * @param next - The full `{ mockResponses, redirects, isRunning }` state to persist.
	 */
	const persist = (next: StoredPopupItemsState) => {
		if (!hasHydratedRef.current) {
			return;
		}
		lastWrittenPayloadRef.current = JSON.stringify(next);
		chrome.storage.local.set({ [STORAGE_KEY]: next });
	};

	/**
	 * Mirrors state written by another mounted instance of this hook (e.g. the popup and an
	 * app tab open at once). Skips changes that match the last payload this instance itself
	 * wrote, so this instance's own write effect doesn't loop back into a redundant setState.
	 */
	useEffect(() => {
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: chrome.storage.AreaName,
		) => {
			if (areaName !== 'local' || !(STORAGE_KEY in changes)) {
				return;
			}
			const nextValue = changes[STORAGE_KEY].newValue as StoredPopupItemsState | undefined;
			if (!nextValue) {
				return;
			}
			// Storage written by a pre-rename build (or otherwise missing `redirects`) has no
			// `redirects` key at all — default it rather than crash later.
			const nextRedirects = nextValue.redirects ?? [];
			const nextPayload = JSON.stringify({
				mockResponses: nextValue.mockResponses,
				redirects: nextRedirects,
				isRunning: nextValue.isRunning,
			});
			if (nextPayload === lastWrittenPayloadRef.current) {
				return;
			}
			setMockResponses(nextValue.mockResponses);
			setRedirects(nextRedirects);
			setIsRunning(nextValue.isRunning);
		};

		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => chrome.storage.onChanged.removeListener(handleStorageChange);
	}, []);

	/**
	 * Flips `enabled` on the item of the given kind and id.
	 *
	 * @param kind - Which list to look in.
	 * @param id - The item's id.
	 */
	const toggleItem = (kind: PopupItem['kind'], id: string) => {
		if (kind === 'mock-response') {
			const next = mockResponses.map((item) =>
				item.id === id ? { ...item, enabled: !item.enabled } : item,
			);
			setMockResponses(next);
			persist({ mockResponses: next, redirects, isRunning });
			return;
		}
		const next = redirects.map((item) =>
			item.id === id ? { ...item, enabled: !item.enabled } : item,
		);
		setRedirects(next);
		persist({ mockResponses, redirects: next, isRunning });
	};

	/**
	 * Deletes the item of the given kind and id.
	 *
	 * @param kind - Which list to look in.
	 * @param id - The item's id.
	 */
	const removeItem = (kind: PopupItem['kind'], id: string) => {
		if (kind === 'mock-response') {
			const next = mockResponses.filter((item) => item.id !== id);
			setMockResponses(next);
			persist({ mockResponses: next, redirects, isRunning });
			return;
		}
		const next = redirects.filter((item) => item.id !== id);
		setRedirects(next);
		persist({ mockResponses, redirects: next, isRunning });
	};

	/**
	 * Replaces mock responses and/or redirect rules wholesale (used by import). Each list is
	 * left untouched when its argument is omitted, rather than being cleared.
	 *
	 * @param nextMockResponses - The full replacement list, or omit to leave mock responses as-is.
	 * @param nextRedirects - The full replacement list, or omit to leave redirects as-is.
	 */
	const replaceItems = (
		nextMockResponses?: MockResponseItem[],
		nextRedirects?: RedirectRuleItem[],
	) => {
		const resolvedMockResponses = nextMockResponses ?? mockResponses;
		const resolvedRedirects = nextRedirects ?? redirects;
		if (nextMockResponses !== undefined) {
			setMockResponses(nextMockResponses);
		}
		if (nextRedirects !== undefined) {
			setRedirects(nextRedirects);
		}
		persist({ mockResponses: resolvedMockResponses, redirects: resolvedRedirects, isRunning });
	};

	/**
	 * Replaces the mock response with the same id as `item`, or appends it if no such item
	 * exists yet.
	 *
	 * @param item - The mock response to insert or replace.
	 */
	const upsertMockResponse = (item: MockResponseItem) => {
		const existingIndex = mockResponses.findIndex((existing) => existing.id === item.id);
		const next =
			existingIndex === -1
				? [...mockResponses, item]
				: mockResponses.map((existing, index) =>
						index === existingIndex ? item : existing,
					);
		setMockResponses(next);
		persist({ mockResponses: next, redirects, isRunning });
	};

	/**
	 * Sets whether interception is running, persisting immediately (see `persist`).
	 *
	 * @param running - The new running state.
	 */
	const setRunning = (running: boolean) => {
		setIsRunning(running);
		persist({ mockResponses, redirects, isRunning: running });
	};

	return {
		mockResponses,
		redirects,
		isRunning,
		hasHydrated,
		setRunning,
		toggleItem,
		removeItem,
		replaceItems,
		upsertMockResponse,
	};
};

/**
 * Hydrates {@link useItemsState} once and shares it with every descendant via context, so the
 * popup and app trees can read/mutate items state directly instead of having it threaded down
 * through props (or, for the app's route pages, re-hydrated from scratch on every navigation).
 *
 * @param props.children - The tree that should share this single items-state instance.
 * @returns A provider wrapping `children`.
 */
export const ItemsStateProvider = ({ children }: { children: ReactNode }) => {
	const itemsState = useItemsState();
	return <ItemsStateContext.Provider value={itemsState}>{children}</ItemsStateContext.Provider>;
};

/**
 * Reads the shared {@link useItemsState} instance provided by {@link ItemsStateProvider}.
 *
 * @returns The current items state and its mutators.
 * @throws If called outside an {@link ItemsStateProvider}.
 */
export const useItemsStateContext = (): ItemsStateContextValue => {
	const context = useContext(ItemsStateContext);
	if (!context) {
		throw new Error('useItemsStateContext must be used within an ItemsStateProvider');
	}
	return context;
};
