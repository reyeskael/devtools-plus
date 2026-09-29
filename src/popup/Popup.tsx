import { Box, Typography, styled } from '@mui/material';
import { ItemsStateProvider } from '../shared/context/ItemsStateContext';
import { PopupHeader } from './components/PopupHeader';
import { PopupPanel } from './components/PopupPanel';

const PopupRoot = styled(Box)(({ theme }) => ({
	width: 620,
	height: 415,
	padding: theme.spacing(2),
	display: 'flex',
	flexDirection: 'column',
	gap: theme.spacing(2),
	backgroundColor: theme.palette.grey[50],
}));

/**
 * The extension's toolbar popup: master switch, tabbed mock-response/HTTP-rule lists,
 * export/import, and the entry points into the full-page app.
 *
 * @returns The popup UI.
 */
export const Popup = () => (
	<ItemsStateProvider>
		<PopupRoot>
			<PopupHeader />
			<PopupPanel />
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ marginTop: 'auto', alignSelf: 'flex-start' }}
			>
				{`v${chrome.runtime.getManifest().version}`}
			</Typography>
		</PopupRoot>
	</ItemsStateProvider>
);
