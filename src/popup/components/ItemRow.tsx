import { IconButton, ListItem, ListItemIcon, ListItemText, Switch } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { Tool } from '../../shared/tools/types';
import { toolIcons } from './toolIcons';

interface ItemRowProps {
	tool: Tool;
	isRunning: boolean;
	onToggleEnabled: (id: string) => void;
	onTogglePin: (id: string) => void;
}

export function ItemRow({ tool, isRunning, onToggleEnabled, onTogglePin }: ItemRowProps) {
	const PinIcon = tool.pinned ? PushPinIcon : PushPinOutlinedIcon;
	const pinLabel = `${tool.pinned ? 'Unpin' : 'Pin'} ${tool.name}`;
	const switchLabel = `${tool.name} switch`;

	return (
		<ListItem sx={{ opacity: isRunning ? 1 : 0.5 }}>
			<ListItemIcon>{toolIcons[tool.icon]}</ListItemIcon>
			<ListItemText primary={tool.name} />
			<IconButton
				disabled={!isRunning}
				onClick={() => onTogglePin(tool.id)}
				aria-label={pinLabel}
			>
				<PinIcon />
			</IconButton>
			<Switch
				checked={tool.enabled}
				disabled={!isRunning}
				onChange={() => onToggleEnabled(tool.id)}
				slotProps={{ input: { 'aria-label': switchLabel } }}
			/>
		</ListItem>
	);
}
