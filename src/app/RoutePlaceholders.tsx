import { Container, Typography } from '@mui/material';

/**
 * Stands in for the `/http-rules` route. Unlike the `/mock-api/*` routes, this one is
 * intentionally permanent — HTTP rules forms are out of scope for this feature entirely.
 *
 * @returns The placeholder UI.
 */
export const HttpRulesPlaceholder = () => (
	<Container maxWidth="lg" sx={{ py: 4 }}>
		<Typography variant="body1">HTTP Rules — not yet implemented</Typography>
	</Container>
);
