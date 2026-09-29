import { Alert, Box, Button, Snackbar } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useState } from 'react';
import { openApp, type AppPage } from '../../shared/chrome/openApp';
import { buildExportFilename, downloadJson } from '../../shared/files/downloadJson';
import { readFileAsText } from '../../shared/files/readFileAsText';
import { parseImportedItems, toExportPayload } from '../../shared/items/transfer';
import type { PopupItem } from '../../shared/items/types';
import { useItemsStateContext } from '../context/ItemsStateContext';
import { ImportDialog } from './ImportDialog';

interface ImportFeedback {
	severity: 'success' | 'error';
	message: string;
}

interface PanelToolbarProps {
	page: AppPage;
}

/**
 * The active tab's toolbar: Export/Import buttons (with their own dialog and feedback) and an
 * Add button that deep-links into the full app for the active tab's page.
 *
 * @param props.page - The full app page to deep-link the Add button to.
 * @returns The panel toolbar UI.
 */
export const PanelToolbar = ({ page }: PanelToolbarProps) => {
	const { mockResponses, httpRules, replaceItems } = useItemsStateContext();
	const [importDialogOpen, setImportDialogOpen] = useState(false);
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
		<>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<Box sx={{ display: 'flex', gap: 0.5 }}>
					<Button
						variant="outlined"
						size="small"
						startIcon={<FileDownloadIcon fontSize="small" />}
						onClick={handleExport}
					>
						Export
					</Button>
					<Button
						variant="outlined"
						size="small"
						startIcon={<FileUploadIcon fontSize="small" />}
						onClick={() => setImportDialogOpen(true)}
					>
						Import
					</Button>
				</Box>
				<Button variant="contained" size="small" startIcon={<OpenInNewIcon />} onClick={() => openApp(page)}>
					Add
				</Button>
			</Box>
			<ImportDialog
				open={importDialogOpen}
				onFileSelected={handleFileSelected}
				onConfirmPaste={handleImportResult}
				onClose={() => setImportDialogOpen(false)}
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
		</>
	);
};
