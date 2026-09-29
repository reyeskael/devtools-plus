import { IconButton, ListItem, ListItemText } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { BrandSwitch } from '../../shared/components/BrandSwitch';

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

/**
 * A single mock response or HTTP rule row in the popup's item list, with an enable/disable
 * switch and a delete button.
 *
 * @param props.item - The row's view model (id, label, secondary text, enabled state).
 * @param props.isRunning - Whether interception is on; disables the row's controls when off.
 * @param props.onToggleEnabled - Called with the item's id when the switch is toggled.
 * @param props.onDelete - Called with the item's id when the delete button is clicked.
 * @returns The item row UI.
 */
export const ItemRow = ({ item, isRunning, onToggleEnabled, onDelete }: ItemRowProps) => {
	const deleteLabel = `Delete ${item.label}`;
	const switchLabel = `${item.label} switch`;

	return (
		<ListItem sx={{ opacity: isRunning ? 1 : 0.5 }}>
			<ListItemText primary={item.label} secondary={item.secondary} />
			<IconButton disabled={!isRunning} onClick={() => onDelete(item.id)} aria-label={deleteLabel}>
				<DeleteOutlinedIcon />
			</IconButton>
			<BrandSwitch
				checked={item.enabled}
				disabled={!isRunning}
				onChange={() => onToggleEnabled(item.id)}
				slotProps={{ input: { 'aria-label': switchLabel } }}
			/>
		</ListItem>
	);
};
