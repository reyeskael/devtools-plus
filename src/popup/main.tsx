import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppThemeProvider } from '../shared/theme';
import { Popup } from './Popup';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AppThemeProvider>
			<Popup />
		</AppThemeProvider>
	</StrictMode>,
);
