import { Box, Chip, IconButton, ListItem, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { MockResponseItem } from '../../shared/items/types';

interface MockApiRowProps {
	item: MockResponseItem;
	onEdit: (id: string) => void;
}

/**
 * A single mock response row on the Mock APIs list page. Shows method, URL pattern,
 * status code/text, and enabled state as discrete, at-a-glance fields rather than one
 * collapsed summary line (contrast the popup's compact `ItemRow`), plus an edit button.
 *
 * @param props.item - The mock response to display.
 * @param props.onEdit - Called with the item's id when the edit button is clicked.
 * @returns The row UI.
 */
export const MockApiRow = ({ item, onEdit }: MockApiRowProps) => (
	<ListItem divider sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
		<Chip
			label={item.enabled ? 'Enabled' : 'Disabled'}
			size="small"
			color={item.enabled ? 'success' : 'default'}
		/>
		<IconButton onClick={() => onEdit(item.id)} aria-label={`Edit ${item.name}`}>
			<EditOutlinedIcon />
		</IconButton>
	</ListItem>
);
