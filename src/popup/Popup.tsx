import { Box, Button, Typography } from '@mui/material';
import { openApp } from '../shared/chrome/openApp';

export function Popup() {
	return (
		<Box sx={{ width: 280, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Typography variant="h6">DevTools Plus</Typography>
			<Button variant="contained" onClick={openApp}>
				Open App
			</Button>
		</Box>
	);
}
