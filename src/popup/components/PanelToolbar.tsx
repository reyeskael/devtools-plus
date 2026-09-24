import { Box, Button, Divider, Menu, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { openApp } from '../../shared/chrome/openApp';

export const PanelToolbar = () => {
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
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<Typography variant="subtitle1">Tools</Typography>
			<Button
				variant="outlined"
				endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
				onClick={(event) => setAnchorEl(event.currentTarget)}
				aria-label={open ? 'Close actions menu' : 'Open actions menu'}
			>
				Actions
			</Button>
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
