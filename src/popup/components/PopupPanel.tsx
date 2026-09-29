import { Box, List, Paper, styled } from '@mui/material';
import { useState } from 'react';
import { openApp, type AppPage } from '../../shared/chrome/openApp';
import { formatHttpRuleSummary, formatMockResponseSummary } from '../../shared/items/formatters';
import type { HttpRuleItem, MockResponseItem, PopupItem } from '../../shared/items/types';
import { useItemsStateContext } from '../../shared/context/ItemsStateContext';
import { EmptyState } from './EmptyState';
import { ItemRow, type ItemRowViewModel } from './ItemRow';
import { PanelToolbar } from './PanelToolbar';
import { PopupTabs, type PopupTabKey } from './PopupTabs';
import { UnderConstruction } from './UnderConstruction';

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
	'http-rules': {
		kind: 'http-rule',
		page: 'http-rules',
		emptyHeadline: 'No HTTP rules yet',
		emptyBody: 'Add an HTTP rule in the full app to get started.',
		emptyActionLabel: 'Add HTTP rule',
	},
};

/**
 * Projects the active tab's items into the view model `ItemRow` renders.
 *
 * @param activeTab - Which tab is active, determining which list to project.
 * @param mockResponses - The full mock responses list.
 * @param httpRules - The full HTTP rules list.
 * @returns Row view models for the active tab's items.
 */
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

/**
 * The popup's tabbed panel card: a shared Export/Import/Add toolbar and tabs, followed by the
 * active tab's item list — or, for the not-yet-enforced HTTP Rules tab, an under-construction
 * placeholder in place of the list.
 *
 * @returns The popup panel UI.
 */
export const PopupPanel = () => {
	const { isRunning, mockResponses, httpRules, toggleItem, removeItem } = useItemsStateContext();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('mock-responses');
	const activeTabConfig = TAB_CONFIG[activeTab];
	const itemRows = getItemRows(activeTab, mockResponses, httpRules);

	return (
		<PopupCard variant="outlined" dimmed={!isRunning}>
			<PanelToolbar page={activeTabConfig.page} />
			<PopupTabs value={activeTab} onChange={setActiveTab} />
			{activeTab === 'http-rules' ? (
				<UnderConstruction
					headline="HTTP Rules is under construction"
					body="Block, redirect, and modify-headers rules aren't enforced yet. Check back in a future update."
				/>
			) : (
				<>
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
				</>
			)}
		</PopupCard>
	);
};
