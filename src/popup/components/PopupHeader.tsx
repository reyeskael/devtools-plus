import { Box, Button, Switch, Typography } from '@mui/material';
import { openApp } from '../../shared/chrome/openApp';

interface PopupHeaderProps {
	isRunning: boolean;
	onRunningChange: (running: boolean) => void;
}

/**
 * The popup's top bar: extension icon, master running switch, and a button to open the full app.
 *
 * @param props.isRunning - Whether interception is currently on.
 * @param props.onRunningChange - Called with the new running state when the switch is toggled.
 * @returns The popup header UI.
 */
export const PopupHeader = ({ isRunning, onRunningChange }: PopupHeaderProps) => {
	const statusLabel = isRunning ? 'DevTools Plus running' : 'DevTools Plus off';

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
			<img
				src={chrome.runtime.getURL('public/icons/icon32.png')}
				alt="DevTools Plus"
				width={32}
				height={32}
			/>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				<Switch
					checked={isRunning}
					onChange={(event) => onRunningChange(event.target.checked)}
					slotProps={{ input: { 'aria-label': 'Master switch' } }}
				/>
				<Typography variant="body2" color="text.secondary">
					{statusLabel}
				</Typography>
			</Box>
			<Button variant="contained" onClick={() => openApp()}>
				Open App
			</Button>
		</Box>
	);
};
