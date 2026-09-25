import { Alert, Box, List, Paper, Snackbar, Typography, styled } from '@mui/material';
import { useState } from 'react';
import { openApp, type AppPage } from '../shared/chrome/openApp';
import { buildExportFilename, downloadJson } from '../shared/files/downloadJson';
import { readFileAsText } from '../shared/files/readFileAsText';
import { formatHttpRuleSummary, formatMockResponseSummary } from '../shared/items/formatters';
import { parseImportedItems, toExportPayload } from '../shared/items/transfer';
import type { HttpRuleItem, MockResponseItem, PopupItem } from '../shared/items/types';
import { usePopupItemsState } from '../shared/hooks/usePopupItemsState';
import { EmptyState } from './components/EmptyState';
import { ImportDialog } from './components/ImportDialog';
import { ItemRow, type ItemRowViewModel } from './components/ItemRow';
import { PanelToolbar } from './components/PanelToolbar';
import { PopupHeader } from './components/PopupHeader';
import { PopupTabs, type PopupTabKey } from './components/PopupTabs';

const PopupRoot = styled(Box)(({ theme }) => ({
	width: 480,
	height: 580,
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

interface ImportFeedback {
	severity: 'success' | 'error';
	message: string;
}

export const Popup = () => {
	const {
		mockResponses,
		httpRules,
		isRunning,
		setRunning,
		toggleItem,
		removeItem,
		replaceItems,
	} = usePopupItemsState();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('mock-responses');
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [pastedText, setPastedText] = useState('');
	const [feedback, setFeedback] = useState<ImportFeedback | null>(null);

	const activeTabConfig = TAB_CONFIG[activeTab];
	const itemRows = getItemRows(activeTab, mockResponses, httpRules);

	const handleExport = () => {
		const allItems: PopupItem[] = [...mockResponses, ...httpRules];
		downloadJson(buildExportFilename(), toExportPayload(allItems));
	};

	const handleImportResult = (text: string) => {
		const result = parseImportedItems(text);
		if (!result.ok) {
			setFeedback({ severity: 'error', message: result.error });
			return;
		}
		replaceItems(
			result.mockResponses.length > 0 ? result.mockResponses : undefined,
			result.httpRules.length > 0 ? result.httpRules : undefined,
		);
		setFeedback({
			severity: 'success',
			message: `Imported ${result.mockResponses.length} mock responses, ${result.httpRules.length} HTTP rules`,
		});
		setImportDialogOpen(false);
		setPastedText('');
	};

	const handleFileSelected = async (file: File) => {
		try {
			const text = await readFileAsText(file);
			handleImportResult(text);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to read file';
			setFeedback({ severity: 'error', message });
		}
	};

	return (
		<PopupRoot>
			<PopupHeader isRunning={isRunning} onRunningChange={setRunning} />
			<PopupCard variant="outlined" dimmed={!isRunning}>
				<PanelToolbar
					page={activeTabConfig.page}
					onExport={handleExport}
					onImport={() => setImportDialogOpen(true)}
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
			<ImportDialog
				open={importDialogOpen}
				pastedText={pastedText}
				onPastedTextChange={setPastedText}
				onFileSelected={handleFileSelected}
				onConfirmPaste={() => handleImportResult(pastedText)}
				onClose={() => {
					setImportDialogOpen(false);
					setPastedText('');
				}}
			/>
			<Snackbar
				open={feedback !== null}
				autoHideDuration={4000}
				onClose={() => setFeedback(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				{feedback ? (
					<Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
						{feedback.message}
					</Alert>
				) : undefined}
			</Snackbar>
		</PopupRoot>
	);
};
