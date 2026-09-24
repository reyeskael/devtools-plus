import { useCallback, useEffect, useRef, useState } from 'react';
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
}

export const usePopupItemsState = (): UsePopupItemsState => {
	const [mockResponses, setMockResponses] = useState<MockResponseItem[]>(seedMockResponses);
	const [httpRules, setHttpRules] = useState<HttpRuleItem[]>(seedHttpRules);
	const [isRunning, setRunning] = useState(true);
	const hasHydratedRef = useRef(false);

	// Load any persisted state once on mount. Until this resolves, the hook
	// keeps rendering its in-memory defaults.
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

	// Persist every change, but only after the initial load has completed —
	// otherwise this would overwrite real stored data with the defaults
	// while the get() above is still in flight.
	useEffect(() => {
		if (!hasHydratedRef.current) {
			return;
		}
		chrome.storage.local.set({ [STORAGE_KEY]: { mockResponses, httpRules, isRunning } });
	}, [mockResponses, httpRules, isRunning]);

	const toggleItem = useCallback((kind: PopupItem['kind'], id: string) => {
		if (kind === 'mock-response') {
			setMockResponses((prev) =>
				prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
			);
			return;
		}
		setHttpRules((prev) =>
			prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
		);
	}, []);

	const removeItem = useCallback((kind: PopupItem['kind'], id: string) => {
		if (kind === 'mock-response') {
			setMockResponses((prev) => prev.filter((item) => item.id !== id));
			return;
		}
		setHttpRules((prev) => prev.filter((item) => item.id !== id));
	}, []);

	return { mockResponses, httpRules, isRunning, setRunning, toggleItem, removeItem };
};
