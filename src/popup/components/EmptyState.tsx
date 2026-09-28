import { Box, Button, Typography } from '@mui/material';

interface EmptyStateProps {
	headline: string;
	body: string;
	actionLabel: string;
	onAction: () => void;
}

/**
 * Placeholder shown in place of an item list when the active tab has no items yet.
 *
 * @param props.headline - The bold headline text.
 * @param props.body - The supporting body text.
 * @param props.actionLabel - The call-to-action button's label.
 * @param props.onAction - Called when the call-to-action button is clicked.
 * @returns The empty-state UI.
 */
export const EmptyState = ({ headline, body, actionLabel, onAction }: EmptyStateProps) => (
	<Box
		sx={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			textAlign: 'center',
			gap: 1,
			py: 4,
		}}
	>
		<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
			{headline}
		</Typography>
		<Typography variant="body2" color="text.secondary">
			{body}
		</Typography>
		<Button variant="contained" onClick={onAction}>
			{actionLabel}
		</Button>
	</Box>
);
