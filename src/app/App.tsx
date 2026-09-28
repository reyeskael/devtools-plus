import { Box, Typography } from '@mui/material';

/**
 * The full-page app shell, opened from the popup's Add/Open App actions. Makes no assumptions
 * about being hosted in a browser tab, so it can be mounted from other extension surfaces
 * (like a future DevTools panel) too.
 *
 * @returns The app shell UI.
 */
export const App = () => (
	<Box sx={{ p: 4 }}>
		<Typography variant="h4">DevTools Plus</Typography>
		<Typography variant="body1" color="text.secondary">
			The full app shell. This component makes no assumptions about being hosted in a browser
			tab, so it can be mounted from other extension surfaces (like a future DevTools panel)
			too.
		</Typography>
	</Box>
);
