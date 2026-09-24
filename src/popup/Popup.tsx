import { Box, List, Paper, Typography, styled } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openApp } from '../shared/chrome/openApp';
import { mockTools } from '../shared/tools/mockTools';
import type { Tool } from '../shared/tools/types';
import { EmptyState } from './components/EmptyState';
import { ItemRow } from './components/ItemRow';
import { PanelToolbar } from './components/PanelToolbar';
import { PopupHeader } from './components/PopupHeader';
import { PopupTabs, type PopupTabKey } from './components/PopupTabs';

// TODO(T-04): temporary shim inlining the old useToolsState logic, adjusted
// for T-03's new component signatures (ItemRow view-model, two-tab layout).
// Wire Popup.tsx up to usePopupItemsState once the item-based UI lands.
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

	const removeTool = useCallback((id: string) => {
		setTools((prev) => prev.filter((tool) => tool.id !== id));
	}, []);

	return { tools, isRunning, setRunning, toggleTool, removeTool };
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

// TODO(T-04): replace with real per-tab collections from usePopupItemsState.
const getFilteredTools = (tools: Tool[]): Tool[] => tools;

// TODO(T-04): replace with real per-tab empty-state copy from usePopupItemsState.
const getEmptyState = (tools: Tool[]) =>
	tools.length === 0 ? (
		<EmptyState
			headline="Nothing here yet"
			body="Nothing to show."
			actionLabel="Add"
			onAction={() => openApp()}
		/>
	) : null;

export const Popup = () => {
	const { tools, isRunning, setRunning, toggleTool, removeTool } = useToolsStateShim();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('mock-responses');

	const filteredTools = getFilteredTools(tools);
	const emptyState = getEmptyState(filteredTools);

	return (
		<PopupRoot>
			<PopupHeader isRunning={isRunning} onRunningChange={setRunning} />
			<PopupCard variant="outlined" dimmed={!isRunning}>
				<PanelToolbar title="Tools" addLabel="Add" onAdd={() => openApp()} />
				<PopupTabs value={activeTab} onChange={setActiveTab} />
				<Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					{emptyState ?? (
						<List>
							{filteredTools.map((tool) => (
								<ItemRow
									key={tool.id}
									item={{ id: tool.id, label: tool.name, secondary: tool.icon, enabled: tool.enabled }}
									isRunning={isRunning}
									onToggleEnabled={toggleTool}
									onDelete={removeTool}
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
