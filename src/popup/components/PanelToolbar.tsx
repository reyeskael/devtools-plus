import { Box, Button, Divider, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { openApp, type AppPage } from '../../shared/chrome/openApp';

interface PanelToolbarProps {
	page: AppPage;
}

export const PanelToolbar = ({ page }: PanelToolbarProps) => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleItemClick = () => {
		openApp();
		handleClose();
	};

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
			<Box sx={{ display: 'flex', gap: 1 }}>
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
