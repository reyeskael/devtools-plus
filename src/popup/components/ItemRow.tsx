import { IconButton, ListItem, ListItemText, Switch } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

export interface ItemRowViewModel {
	id: string;
	label: string;
	secondary: string;
	enabled: boolean;
}

interface ItemRowProps {
	item: ItemRowViewModel;
	isRunning: boolean;
	onToggleEnabled: (id: string) => void;
	onDelete: (id: string) => void;
}

export const ItemRow = ({ item, isRunning, onToggleEnabled, onDelete }: ItemRowProps) => {
	const deleteLabel = `Delete ${item.label}`;
	const switchLabel = `${item.label} switch`;

	return (
		<ListItem sx={{ opacity: isRunning ? 1 : 0.5 }}>
			<ListItemText primary={item.label} secondary={item.secondary} />
			<IconButton disabled={!isRunning} onClick={() => onDelete(item.id)} aria-label={deleteLabel}>
				<DeleteOutlinedIcon />
			</IconButton>
			<Switch
				checked={item.enabled}
				disabled={!isRunning}
				onChange={() => onToggleEnabled(item.id)}
				slotProps={{ input: { 'aria-label': switchLabel } }}
			/>
		</ListItem>
	);
};
