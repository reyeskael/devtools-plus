import { Box, List, Paper, Typography, styled } from '@mui/material';
import { useState } from 'react';
import { useToolsState } from '../shared/hooks/useToolsState';
import type { Tool } from '../shared/tools/types';
import { EmptyState } from './components/EmptyState';
import { ItemRow } from './components/ItemRow';
import { PanelToolbar } from './components/PanelToolbar';
import { PopupHeader } from './components/PopupHeader';
import { PopupTabs, type PopupTabKey } from './components/PopupTabs';

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
	const { tools, isRunning, setRunning, toggleTool, togglePin } = useToolsState();
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
