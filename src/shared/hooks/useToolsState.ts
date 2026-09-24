import { useCallback, useEffect, useRef, useState } from 'react';
import { mockTools } from '../tools/mockTools';
import type { Tool } from '../tools/types';

const STORAGE_KEY = 'toolsState';

interface StoredToolsState {
	tools: Tool[];
	isRunning: boolean;
}

export interface UseToolsState {
	tools: Tool[];
	isRunning: boolean;
	setRunning: (running: boolean) => void;
	toggleTool: (id: string) => void;
	togglePin: (id: string) => void;
}

export const useToolsState = (): UseToolsState => {
	const [tools, setTools] = useState<Tool[]>(mockTools);
	const [isRunning, setRunning] = useState(true);
	const hasHydratedRef = useRef(false);

	// Load any persisted state once on mount. Until this resolves, the hook
	// keeps rendering its in-memory defaults.
	useEffect(() => {
		chrome.storage.local.get(STORAGE_KEY, (result) => {
			const stored = result[STORAGE_KEY] as StoredToolsState | undefined;
			if (stored) {
				setTools(stored.tools);
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
		chrome.storage.local.set({ [STORAGE_KEY]: { tools, isRunning } });
	}, [tools, isRunning]);

	const toggleTool = useCallback((id: string) => {
		setTools((prev) =>
			prev.map((tool) => (tool.id === id ? { ...tool, enabled: !tool.enabled } : tool)),
		);
	}, []);

	const togglePin = useCallback((id: string) => {
		setTools((prev) =>
			prev.map((tool) => (tool.id === id ? { ...tool, pinned: !tool.pinned } : tool)),
		);
	}, []);

	return { tools, isRunning, setRunning, toggleTool, togglePin };
};
