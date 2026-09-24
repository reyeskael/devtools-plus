import { Box, List, Paper, Typography, styled } from '@mui/material';
import { useState } from 'react';
import { openApp, type AppPage } from '../shared/chrome/openApp';
import { formatHttpRuleSummary, formatMockResponseSummary } from '../shared/items/formatters';
import type { HttpRuleItem, MockResponseItem, PopupItem } from '../shared/items/types';
import { usePopupItemsState } from '../shared/hooks/usePopupItemsState';
import { EmptyState } from './components/EmptyState';
import { ItemRow, type ItemRowViewModel } from './components/ItemRow';
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

interface TabConfig {
	kind: PopupItem['kind'];
	page: AppPage;
	title: string;
	emptyHeadline: string;
	emptyBody: string;
	emptyActionLabel: string;
}

const TAB_CONFIG: Record<PopupTabKey, TabConfig> = {
	'mock-responses': {
		kind: 'mock-response',
		page: 'mock-api',
		title: 'API Response Mock',
		emptyHeadline: 'No mock responses yet',
		emptyBody: 'Add a mock response in the full app to get started.',
		emptyActionLabel: 'Add mock response',
	},
	'http-rules': {
		kind: 'http-rule',
		page: 'http-rules',
		title: 'HTTP Rules',
		emptyHeadline: 'No HTTP rules yet',
		emptyBody: 'Add an HTTP rule in the full app to get started.',
		emptyActionLabel: 'Add HTTP rule',
	},
};

const getItemRows = (
	activeTab: PopupTabKey,
	mockResponses: MockResponseItem[],
	httpRules: HttpRuleItem[],
): ItemRowViewModel[] => {
	if (activeTab === 'mock-responses') {
		return mockResponses.map((item) => ({
			id: item.id,
			label: item.name,
			secondary: formatMockResponseSummary(item),
			enabled: item.enabled,
		}));
	}
	return httpRules.map((item) => ({
		id: item.id,
		label: item.name,
		secondary: formatHttpRuleSummary(item),
		enabled: item.enabled,
	}));
};

export const Popup = () => {
	const { mockResponses, httpRules, isRunning, setRunning, toggleItem, removeItem } =
		usePopupItemsState();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('mock-responses');

	const activeTabConfig = TAB_CONFIG[activeTab];
	const itemRows = getItemRows(activeTab, mockResponses, httpRules);

	return (
		<PopupRoot>
			<PopupHeader isRunning={isRunning} onRunningChange={setRunning} />
			<PopupCard variant="outlined" dimmed={!isRunning}>
				<PanelToolbar
					title={activeTabConfig.title}
					addLabel="Add"
					onAdd={() => openApp(activeTabConfig.page)}
				/>
				<PopupTabs value={activeTab} onChange={setActiveTab} />
				<Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					{itemRows.length === 0 ? (
						<EmptyState
							headline={activeTabConfig.emptyHeadline}
							body={activeTabConfig.emptyBody}
							actionLabel={activeTabConfig.emptyActionLabel}
							onAction={() => openApp(activeTabConfig.page)}
						/>
					) : (
						<List>
							{itemRows.map((item) => (
								<ItemRow
									key={item.id}
									item={item}
									isRunning={isRunning}
									onToggleEnabled={(id) => toggleItem(activeTabConfig.kind, id)}
									onDelete={(id) => removeItem(activeTabConfig.kind, id)}
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
