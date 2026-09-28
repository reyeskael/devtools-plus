import { useEffect, useRef, useState } from 'react';
import { seedHttpRules, seedMockResponses } from '../items/seedItems';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../storage/keys';
import type { HttpRuleItem, MockResponseItem, PopupItem } from '../items/types';

interface StoredPopupItemsState {
	mockResponses: MockResponseItem[];
	httpRules: HttpRuleItem[];
	isRunning: boolean;
}

export interface UseItemsState {
	mockResponses: MockResponseItem[];
	httpRules: HttpRuleItem[];
	isRunning: boolean;
	/**
	 * Whether the initial `chrome.storage.local.get` load has completed (whether or not it found
	 * anything to hydrate). Callers that need to distinguish "no persisted data yet" from "still
	 * loading" — e.g. deciding whether an id genuinely doesn't exist — should gate on this rather
	 * than on `mockResponses`/`httpRules` being non-empty.
	 */
	hasHydrated: boolean;
	setRunning: (running: boolean) => void;
	toggleItem: (kind: PopupItem['kind'], id: string) => void;
	removeItem: (kind: PopupItem['kind'], id: string) => void;
	replaceItems: (mockResponses?: MockResponseItem[], httpRules?: HttpRuleItem[]) => void;
	upsertMockResponse: (item: MockResponseItem) => void;
}

/**
 * Owns the popup's `{ mockResponses, httpRules, isRunning }` state, hydrating it from
 * `chrome.storage.local` on mount and persisting every subsequent change back to it — the
 * top of the popup → bridge → interceptor data flow described in the repo's CLAUDE.md.
 *
 * @returns The current items/running state plus mutators for toggling, removing, and
 * replacing items and for setting `isRunning`.
 */
export const useItemsState = (): UseItemsState => {
	const [mockResponses, setMockResponses] = useState<MockResponseItem[]>(seedMockResponses);
	const [httpRules, setHttpRules] = useState<HttpRuleItem[]>(seedHttpRules);
	const [isRunning, setRunning] = useState(true);
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
				setHttpRules(stored.httpRules);
				setRunning(stored.isRunning);
			}
			hasHydratedRef.current = true;
			setHasHydrated(true);
		});
	}, []);

	/**
	 * Persists every change, but only after the initial load has completed — otherwise this
	 * would overwrite real stored data with the defaults while the get() above is still in
	 * flight. Also records the written payload so the `onChanged` listener below can recognize
	 * and ignore the event this write itself fires.
	 */
	useEffect(() => {
		if (!hasHydratedRef.current) {
			return;
		}
		const payload = { mockResponses, httpRules, isRunning };
		lastWrittenPayloadRef.current = JSON.stringify(payload);
		chrome.storage.local.set({ [STORAGE_KEY]: payload });
	}, [mockResponses, httpRules, isRunning]);

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
			const nextPayload = JSON.stringify({
				mockResponses: nextValue.mockResponses,
				httpRules: nextValue.httpRules,
				isRunning: nextValue.isRunning,
			});
			if (nextPayload === lastWrittenPayloadRef.current) {
				return;
			}
			setMockResponses(nextValue.mockResponses);
			setHttpRules(nextValue.httpRules);
			setRunning(nextValue.isRunning);
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
			setMockResponses((prev) =>
				prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
			);
			return;
		}
		setHttpRules((prev) =>
			prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
		);
	};

	/**
	 * Deletes the item of the given kind and id.
	 *
	 * @param kind - Which list to look in.
	 * @param id - The item's id.
	 */
	const removeItem = (kind: PopupItem['kind'], id: string) => {
		if (kind === 'mock-response') {
			setMockResponses((prev) => prev.filter((item) => item.id !== id));
			return;
		}
		setHttpRules((prev) => prev.filter((item) => item.id !== id));
	};

	/**
	 * Replaces mock responses and/or HTTP rules wholesale (used by import). Each list is left
	 * untouched when its argument is omitted, rather than being cleared.
	 *
	 * @param nextMockResponses - The full replacement list, or omit to leave mock responses as-is.
	 * @param nextHttpRules - The full replacement list, or omit to leave HTTP rules as-is.
	 */
	const replaceItems = (
		nextMockResponses?: MockResponseItem[],
		nextHttpRules?: HttpRuleItem[],
	) => {
		if (nextMockResponses !== undefined) {
			setMockResponses(nextMockResponses);
		}
		if (nextHttpRules !== undefined) {
			setHttpRules(nextHttpRules);
		}
	};

	/**
	 * Replaces the mock response with the same id as `item`, or appends it if no such item
	 * exists yet.
	 *
	 * @param item - The mock response to insert or replace.
	 */
	const upsertMockResponse = (item: MockResponseItem) => {
		setMockResponses((prev) => {
			const existingIndex = prev.findIndex((existing) => existing.id === item.id);
			if (existingIndex === -1) {
				return [...prev, item];
			}
			const next = [...prev];
			next[existingIndex] = item;
			return next;
		});
	};

	return {
		mockResponses,
		httpRules,
		isRunning,
		hasHydrated,
		setRunning,
		toggleItem,
		removeItem,
		replaceItems,
		upsertMockResponse,
	};
};
