import { Box, Button, Typography } from '@mui/material';
import { openApp } from '../../shared/chrome/openApp';
import { BrandSwitch } from '../../shared/components/BrandSwitch';
import { useItemsStateContext } from '../../shared/context/ItemsStateContext';

/**
 * The popup's top bar: extension icon, master running switch, and a button to open the full app.
 *
 * @returns The popup header UI.
 */
export const PopupHeader = () => {
	const { isRunning, setRunning } = useItemsStateContext();
	const statusLabel = isRunning ? 'DevTools Plus running' : 'DevTools Plus off';

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<img
				src={chrome.runtime.getURL('public/icons/icon32.png')}
				alt="DevTools Plus"
				width={32}
				height={32}
			/>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
					<BrandSwitch
						checked={isRunning}
						onChange={(event) => setRunning(event.target.checked)}
						slotProps={{ input: { 'aria-label': 'Master switch' } }}
					/>
					<Typography variant="caption" color="text.secondary">
						{statusLabel}
					</Typography>
				</Box>
				<Button variant="contained" size="small" onClick={() => openApp()}>
					Open App
				</Button>
			</Box>
		</Box>
	);
};
