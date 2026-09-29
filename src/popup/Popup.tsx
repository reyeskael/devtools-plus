import { Alert, Box, Snackbar, Typography, styled } from '@mui/material';
import { useState } from 'react';
import { buildExportFilename, downloadJson } from '../shared/files/downloadJson';
import { readFileAsText } from '../shared/files/readFileAsText';
import { parseImportedItems, toExportPayload } from '../shared/items/transfer';
import type { PopupItem } from '../shared/items/types';
import { useItemsState } from '../shared/hooks/useItemsState';
import { ImportDialog } from './components/ImportDialog';
import { PopupHeader } from './components/PopupHeader';
import { PopupPanel } from './components/PopupPanel';
import type { PopupTabKey } from './components/PopupTabs';

const PopupRoot = styled(Box)(({ theme }) => ({
	width: 620,
	height: 415,
	padding: theme.spacing(2),
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(2),
	backgroundColor: theme.palette.grey[50],
}));

interface ImportFeedback {
	severity: 'success' | 'error';
	message: string;
}

/**
 * The extension's toolbar popup: master switch, tabbed mock-response/HTTP-rule lists,
 * export/import, and the entry points into the full-page app.
 *
 * @returns The popup UI.
 */
export const Popup = () => {
	const {
		mockResponses,
		httpRules,
		isRunning,
		setRunning,
		toggleItem,
		removeItem,
		replaceItems,
	} = useItemsState();
	const [activeTab, setActiveTab] = useState<PopupTabKey>('mock-responses');
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [pastedText, setPastedText] = useState('');
	const [feedback, setFeedback] = useState<ImportFeedback | null>(null);

	/** Downloads every mock response and HTTP rule as one dated `.json` export file. */
	const handleExport = () => {
		const allItems: PopupItem[] = [...mockResponses, ...httpRules];
		downloadJson(buildExportFilename(), toExportPayload(allItems));
	};

	/**
	 * Parses and applies imported JSON text, surfacing a success/error snackbar and closing
	 * the import dialog on success.
	 *
	 * @param text - The raw JSON text to import (from a picked file or the paste field).
	 */
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

	/**
	 * Reads a picked import file and hands its text to {@link handleImportResult}, surfacing
	 * a read-failure snackbar instead if the file can't be read.
	 *
	 * @param file - The file chosen in the import dialog.
	 */
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
			<PopupPanel
				activeTab={activeTab}
				onTabChange={setActiveTab}
				isRunning={isRunning}
				mockResponses={mockResponses}
				httpRules={httpRules}
				onExport={handleExport}
				onImport={() => setImportDialogOpen(true)}
				onToggleEnabled={toggleItem}
				onDelete={removeItem}
			/>
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
