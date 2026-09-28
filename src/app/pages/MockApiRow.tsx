import { Box, Chip, ListItem, Typography } from '@mui/material';
import type { MockResponseItem } from '../../shared/items/types';

interface MockApiRowProps {
	item: MockResponseItem;
}

/**
 * A single mock response row on the Mock APIs list page. Shows method, URL pattern,
 * status code/text, and enabled state as discrete, at-a-glance fields rather than one
 * collapsed summary line (contrast the popup's compact `ItemRow`).
 *
 * @param props.item - The mock response to display.
 * @returns The row UI.
 */
export const MockApiRow = ({ item }: MockApiRowProps) => (
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
	</ListItem>
);
