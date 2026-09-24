import { Box, List, Paper, Typography, styled } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mockTools } from '../shared/tools/mockTools';
import type { Tool } from '../shared/tools/types';
import { EmptyState } from './components/EmptyState';
import { ItemRow } from './components/ItemRow';
import { PanelToolbar } from './components/PanelToolbar';
import { PopupHeader } from './components/PopupHeader';
import { PopupTabs, type PopupTabKey } from './components/PopupTabs';

// TODO(T-04): temporary shim inlining the old useToolsState logic. Wire
// Popup.tsx up to usePopupItemsState once the item-based UI lands.
const TOOLS_STORAGE_KEY = 'toolsState';

interface StoredToolsState {
	tools: Tool[];
	isRunning: boolean;
}

const useToolsStateShim = () => {
	const [tools, setTools] = useState<Tool[]>(mockTools);
	const [isRunning, setRunning] = useState(true);
	const hasHydratedRef = useRef(false);

	// Load any persisted state once on mount. Until this resolves, the hook
	// keeps rendering its in-memory defaults.
	useEffect(() => {
		chrome.storage.local.get(TOOLS_STORAGE_KEY, (result) => {
			const stored = result[TOOLS_STORAGE_KEY] as StoredToolsState | undefined;
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
		chrome.storage.local.set({ [TOOLS_STORAGE_KEY]: { tools, isRunning } });
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

const PopupRoot = styled(Box)(({ theme }) => ({
	width: 480,
	height: 480,
	padding: theme.spacing(2),
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(2),
	backgroundColor: theme.palette.grey[50],
}));

const PopupCard = styled(Paper, {
	shouldForwardProp: (prop) => prop !== 'dimmed',
})<{ dimmed: boolean }>(({ theme, dimmed }) => ({
	flex: 1,
	minHeight: 0,
	display: 'flex',
	flexDirection: 'column',
	padding: 16,
	gap: 16,
	backgroundColor: dimmed ? theme.palette.grey[100] : theme.palette.background.paper,
	borderColor: dimmed ? theme.palette.grey[300] : theme.palette.divider,
}));

const getFilteredTools = (tools: Tool[], activeTab: PopupTabKey, isRunning: boolean): Tool[] => {
	if (activeTab === 'pinned') {
		return tools.filter((tool) => tool.pinned);
	}
	if (activeTab === 'active') {
		return tools.filter((tool) => isRunning && tool.enabled);
	}
	return tools;
};

const getEmptyState = (
	activeTab: PopupTabKey,
	isRunning: boolean,
	onBrowseAll: () => void,
	onTurnOn: () => void,
) => {
	if (activeTab === 'pinned') {
		return (
			<EmptyState
				headline="Nothing pinned yet"
				body="Pin your favorite tools for quick access."
				actionLabel="Browse all tools"
				onAction={onBrowseAll}
			/>
		);
	}
	if (activeTab === 'active' && isRunning) {
		return (
			<EmptyState
				headline="No active tools"
				body="Turn on a tool to see it appear here."
				actionLabel="View all tools"
				onAction={onBrowseAll}
			/>
		);
	}
	if (activeTab === 'active' && !isRunning) {
		return (
			<EmptyState
				headline="DevTools Plus is off"
				body="Turn the extension back on to use your tools."
				actionLabel="Turn on"
				onAction={onTurnOn}
			/>
		);
	}
	return null;
};

export const Popup = () => {
	const { tools, isRunning, setRunning, toggleTool, togglePin } = useToolsStateShim();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('pinned');

	const filteredTools = getFilteredTools(tools, activeTab, isRunning);
	const emptyState =
		filteredTools.length === 0
			? getEmptyState(
					activeTab,
					isRunning,
					() => setActiveTab('all'),
					() => setRunning(true),
				)
			: null;

	return (
		<PopupRoot>
			<PopupHeader isRunning={isRunning} onRunningChange={setRunning} />
			<PopupCard variant="outlined" dimmed={!isRunning}>
				<PanelToolbar />
				<PopupTabs value={activeTab} onChange={setActiveTab} />
				<Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					{emptyState ?? (
						<List>
							{filteredTools.map((tool) => (
								<ItemRow
									key={tool.id}
									tool={tool}
									isRunning={isRunning}
									onToggleEnabled={toggleTool}
									onTogglePin={togglePin}
								/>
							))}
						</List>
					)}
				</Box>
			</PopupCard>
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ marginTop: 'auto', alignSelf: 'flex-start' }}
			>
				{`v${chrome.runtime.getManifest().version}`}
			</Typography>
		</PopupRoot>
	);
};
