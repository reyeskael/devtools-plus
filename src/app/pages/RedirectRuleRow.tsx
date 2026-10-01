import { Box, IconButton, ListItem, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { KeyboardEvent } from 'react';
import { BrandSwitch } from '../../shared/components/BrandSwitch';
import { formatRedirectSummary } from '../../shared/items/formatters';
import type { RedirectRuleItem } from '../../shared/items/types';

interface RedirectRuleRowProps {
	item: RedirectRuleItem;
	onEdit: (id: string) => void;
	onToggle: (id: string) => void;
	onDelete: (id: string) => void;
}

/**
 * A single redirect rule row on the Redirect Rules list page. Shows the rule's name and a
 * one-line summary (methods, pattern, destination) via `formatRedirectSummary`, plus an
 * enable/disable switch. Clicking anywhere in the row opens the editor; the switch and delete
 * button stop that click from bubbling.
 *
 * @param props.item - The redirect rule to display.
 * @param props.onEdit - Called with the item's id when the row is clicked (or activated via keyboard).
 * @param props.onToggle - Called with the item's id when the switch is toggled.
 * @param props.onDelete - Called with the item's id when the delete button is clicked.
 * @returns The row UI.
 */
export const RedirectRuleRow = ({ item, onEdit, onToggle, onDelete }: RedirectRuleRowProps) => {
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
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body1">{item.name}</Typography>
				<Typography variant="body2" color="text.secondary" noWrap>
					{formatRedirectSummary(item)}
				</Typography>
			</Box>
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
