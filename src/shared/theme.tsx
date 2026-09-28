import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';

/** The MUI theme shared by the popup and full-page app. */
export const theme = createTheme({
	palette: {
		mode: 'light',
		primary: {
			main: '#1976d2',
		},
	},
});

/**
 * Wraps `children` with the shared MUI theme and `CssBaseline`'s global reset.
 *
 * @param props.children - The subtree to theme.
 * @returns The themed subtree.
 */
export const AppThemeProvider = ({ children }: { children: ReactNode }) => (
	<ThemeProvider theme={theme}>
		<CssBaseline />
		{children}
	</ThemeProvider>
);
