import { Box, Button, Divider, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
 * The active tab's toolbar: Export/Import buttons, an Add button that deep-links into the
 * full app for the active tab's page, and an Actions menu.
 *
 * @param props.page - The full app page to deep-link the Add button to.
 * @param props.onExport - Called when the Export button is clicked.
 * @param props.onImport - Called when the Import button is clicked.
 * @returns The panel toolbar UI.
 */
export const PanelToolbar = ({ page, onExport, onImport }: PanelToolbarProps) => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);

	/** Closes the Actions menu. */
	const handleClose = () => {
		setAnchorEl(null);
	};

	/** Opens the full app and closes the Actions menu, for every menu item (all placeholders today). */
	const handleItemClick = () => {
		openApp();
		handleClose();
	};

	return (
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
			<Box sx={{ display: 'flex', gap: 0.5 }}>
				<Button
					variant="contained"
					size="small"
					startIcon={<OpenInNewIcon />}
					onClick={() => openApp(page)}
				>
					Add
				</Button>
				<Button
					variant="outlined"
					endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
					onClick={(event) => setAnchorEl(event.currentTarget)}
					aria-label={open ? 'Close actions menu' : 'Open actions menu'}
				>
					Actions
				</Button>
			</Box>
			<Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
				<MenuItem onClick={handleItemClick}>Manage tools</MenuItem>
				<MenuItem onClick={handleItemClick}>Settings</MenuItem>
				<MenuItem onClick={handleItemClick}>Keyboard shortcuts</MenuItem>
				<Divider />
				<MenuItem onClick={handleItemClick}>Open full app</MenuItem>
			</Menu>
		</Box>
	);
};
