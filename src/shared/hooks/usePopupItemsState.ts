import { useEffect, useRef, useState } from 'react';
import { seedHttpRules, seedMockResponses } from '../items/seedItems';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../storage/keys';
import type { HttpRuleItem, MockResponseItem, PopupItem } from '../items/types';

interface StoredPopupItemsState {
	mockResponses: MockResponseItem[];
	httpRules: HttpRuleItem[];
	isRunning: boolean;
}

export interface UsePopupItemsState {
	mockResponses: MockResponseItem[];
	httpRules: HttpRuleItem[];
	isRunning: boolean;
	setRunning: (running: boolean) => void;
	toggleItem: (kind: PopupItem['kind'], id: string) => void;
	removeItem: (kind: PopupItem['kind'], id: string) => void;
	replaceItems: (mockResponses?: MockResponseItem[], httpRules?: HttpRuleItem[]) => void;
}

/**
 * Owns the popup's `{ mockResponses, httpRules, isRunning }` state, hydrating it from
 * `chrome.storage.local` on mount and persisting every subsequent change back to it — the
 * top of the popup → bridge → interceptor data flow described in the repo's CLAUDE.md.
 *
 * @returns The current items/running state plus mutators for toggling, removing, and
 * replacing items and for setting `isRunning`.
 */
export const usePopupItemsState = (): UsePopupItemsState => {
	const [mockResponses, setMockResponses] = useState<MockResponseItem[]>(seedMockResponses);
	const [httpRules, setHttpRules] = useState<HttpRuleItem[]>(seedHttpRules);
	const [isRunning, setRunning] = useState(true);
	const hasHydratedRef = useRef(false);

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
		});
	}, []);

	/**
	 * Persists every change, but only after the initial load has completed — otherwise this
	 * would overwrite real stored data with the defaults while the get() above is still in
	 * flight.
	 */
	useEffect(() => {
		if (!hasHydratedRef.current) {
			return;
		}
		chrome.storage.local.set({ [STORAGE_KEY]: { mockResponses, httpRules, isRunning } });
	}, [mockResponses, httpRules, isRunning]);

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

	return {
		mockResponses,
		httpRules,
		isRunning,
		setRunning,
		toggleItem,
		removeItem,
		replaceItems,
	};
};
