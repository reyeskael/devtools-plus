import { Box, Typography } from '@mui/material';

export function App() {
	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="h4">DevTools Plus</Typography>
			<Typography variant="body1" color="text.secondary">
				The full app shell. This component makes no assumptions about being hosted in a
				browser tab, so it can be mounted from other extension surfaces (like a future
				DevTools panel) too.
			</Typography>
		</Box>
	);
}
