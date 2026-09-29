import { Box, Button } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { openApp, type AppPage } from '../../shared/chrome/openApp';

interface PanelToolbarProps {
	page: AppPage;
	onExport: () => void;
	onImport: () => void;
}

/**
 * The active tab's toolbar: Export/Import buttons and an Add button that deep-links into the
 * full app for the active tab's page.
 *
 * @param props.page - The full app page to deep-link the Add button to.
 * @param props.onExport - Called when the Export button is clicked.
 * @param props.onImport - Called when the Import button is clicked.
 * @returns The panel toolbar UI.
 */
export const PanelToolbar = ({ page, onExport, onImport }: PanelToolbarProps) => (
	<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
		<Box sx={{ display: 'flex', gap: 0.5 }}>
			<Button
				variant="outlined"
				size="small"
				startIcon={<FileDownloadIcon fontSize="small" />}
				onClick={onExport}
			>
				Export
			</Button>
			<Button
				variant="outlined"
				size="small"
				startIcon={<FileUploadIcon fontSize="small" />}
				onClick={onImport}
			>
				Import
			</Button>
		</Box>
		<Button variant="contained" size="small" startIcon={<OpenInNewIcon />} onClick={() => openApp(page)}>
			Add
		</Button>
	</Box>
);
