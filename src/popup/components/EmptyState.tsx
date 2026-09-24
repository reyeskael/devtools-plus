import { Box, Button, Typography } from '@mui/material';

interface EmptyStateProps {
	headline: string;
	body: string;
	actionLabel: string;
	onAction: () => void;
}

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
