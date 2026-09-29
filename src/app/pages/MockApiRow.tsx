import { Box, Chip, IconButton, ListItem, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { KeyboardEvent } from 'react';
import { BrandSwitch } from '../../shared/components/BrandSwitch';
import type { MockResponseItem } from '../../shared/items/types';

interface MockApiRowProps {
	item: MockResponseItem;
	onEdit: (id: string) => void;
	onToggle: (id: string) => void;
	onDelete: (id: string) => void;
}

/**
 * A single mock response row on the Mock APIs list page. Shows method, URL pattern,
 * status code/text, and an enable/disable switch as discrete, at-a-glance fields
 * (contrast the popup's compact `ItemRow`). Clicking anywhere in the row opens the
 * editor; the switch and delete button stop that click from bubbling.
 *
 * @param props.item - The mock response to display.
 * @param props.onEdit - Called with the item's id when the row is clicked (or activated via keyboard).
 * @param props.onToggle - Called with the item's id when the switch is toggled.
 * @param props.onDelete - Called with the item's id when the delete button is clicked.
 * @returns The row UI.
 */
export const MockApiRow = ({ item, onEdit, onToggle, onDelete }: MockApiRowProps) => {
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onEdit(item.id);
		}
	};

	return (
		<ListItem
			divider
			role="button"
			tabIndex={0}
			aria-label={`Edit ${item.name}`}
			onClick={() => onEdit(item.id)}
			onKeyDown={handleKeyDown}
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 2,
				cursor: 'pointer',
				'&:hover': { backgroundColor: 'action.hover' },
			}}
		>
			<Chip label={item.method} size="small" color="primary" variant="outlined" />
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body1">{item.name}</Typography>
				<Typography variant="body2" color="text.secondary" noWrap>
					{item.urlPattern}
				</Typography>
			</Box>
			<Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
				{item.statusText ? `${item.statusCode} ${item.statusText}` : item.statusCode}
			</Typography>
			<BrandSwitch
				checked={item.enabled}
				onClick={(event) => event.stopPropagation()}
				onChange={() => onToggle(item.id)}
				slotProps={{ input: { 'aria-label': `${item.name} switch` } }}
			/>
			<IconButton
				onClick={(event) => {
					event.stopPropagation();
					onDelete(item.id);
				}}
				aria-label={`Delete ${item.name}`}
			>
				<DeleteOutlinedIcon />
			</IconButton>
		</ListItem>
	);
};
