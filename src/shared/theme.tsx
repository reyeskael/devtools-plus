import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';

export const theme = createTheme({
	palette: {
		mode: 'light',
		primary: {
			main: '#1976d2',
		},
	},
});

export const AppThemeProvider = ({ children }: { children: ReactNode }) => (
	<ThemeProvider theme={theme}>
		<CssBaseline />
		{children}
	</ThemeProvider>
);
