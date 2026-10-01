import { Box, List, Paper, styled } from '@mui/material';
import { useState } from 'react';
import { openApp, type AppPage } from '../../shared/chrome/openApp';
import { formatMockResponseSummary, formatRedirectSummary } from '../../shared/items/formatters';
import type { MockResponseItem, PopupItem, RedirectRuleItem } from '../../shared/items/types';
import { useItemsStateContext } from '../../shared/context/ItemsStateContext';
import { EmptyState } from './EmptyState';
import { ItemRow, type ItemRowViewModel } from './ItemRow';
import { PanelToolbar } from './PanelToolbar';
import { PopupTabs, type PopupTabKey } from './PopupTabs';

const PopupCard = styled(Paper, {
	shouldForwardProp: (prop) => prop !== 'dimmed',
})<{ dimmed: boolean }>(({ theme, dimmed }) => ({
	flex: 1,
	minHeight: 0,
	display: 'flex',
	flexDirection: 'column',
	padding: 16,
	backgroundColor: dimmed ? theme.palette.grey[100] : theme.palette.background.paper,
	borderColor: dimmed ? theme.palette.grey[300] : theme.palette.divider,
}));

interface TabConfig {
	kind: PopupItem['kind'];
	page: AppPage;
	emptyHeadline: string;
	emptyBody: string;
	emptyActionLabel: string;
}

const TAB_CONFIG: Record<PopupTabKey, TabConfig> = {
	'mock-responses': {
		kind: 'mock-response',
		page: 'mock-api',
		emptyHeadline: 'No mock responses yet',
		emptyBody: 'Add a mock response in the full app to get started.',
		emptyActionLabel: 'Add mock response',
	},
	redirects: {
		kind: 'redirect',
		page: 'redirects',
		emptyHeadline: 'No redirect rules yet',
		emptyBody: 'Add a redirect rule in the full app to get started.',
		emptyActionLabel: 'Add redirect rule',
	},
};

/**
 * Projects the active tab's items into the view model `ItemRow` renders.
 *
 * @param activeTab - Which tab is active, determining which list to project.
 * @param mockResponses - The full mock responses list.
 * @param redirects - The full redirect rules list.
 * @returns Row view models for the active tab's items.
 */
const getItemRows = (
	activeTab: PopupTabKey,
	mockResponses: MockResponseItem[],
	redirects: RedirectRuleItem[],
): ItemRowViewModel[] => {
	if (activeTab === 'mock-responses') {
		return mockResponses.map((item) => ({
			id: item.id,
			label: item.name,
			secondary: formatMockResponseSummary(item),
			enabled: item.enabled,
		}));
	}
	return redirects.map((item) => ({
		id: item.id,
		label: item.name,
		secondary: formatRedirectSummary(item),
		enabled: item.enabled,
	}));
};

/**
 * The popup's tabbed panel card: a shared Export/Import/Add toolbar and tabs, followed by the
 * active tab's item list — both the "API Mock" and "Redirect Rules" tabs render their items the
 * same way.
 *
 * @returns The popup panel UI.
 */
export const PopupPanel = () => {
	const { isRunning, mockResponses, redirects, toggleItem, removeItem } = useItemsStateContext();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('mock-responses');
	const activeTabConfig = TAB_CONFIG[activeTab];
	const itemRows = getItemRows(activeTab, mockResponses, redirects);

	return (
		<PopupCard variant="outlined" dimmed={!isRunning}>
			<PanelToolbar page={activeTabConfig.page} />
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
					<List sx={{ padding: '0px' }}>
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
	);
};
