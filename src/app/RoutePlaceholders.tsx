import { Box, Typography } from '@mui/material';
import { useParams } from 'wouter';

/**
 * Stands in for the `/mock-api` list route until T-05 builds the real `MockApiPage`.
 *
 * @returns The placeholder UI.
 */
export const MockApiListPlaceholder = () => (
	<Box sx={{ p: 4 }}>
		<Typography variant="body1">Mock API list — placeholder, T-05 will replace this</Typography>
	</Box>
);

/**
 * Stands in for the `/mock-api/new` create route until T-05 builds the real form.
 *
 * @returns The placeholder UI.
 */
export const MockApiNewPlaceholder = () => (
	<Box sx={{ p: 4 }}>
		<Typography variant="body1">Mock API create — placeholder, T-05 will replace this</Typography>
	</Box>
);

/**
 * Stands in for the `/mock-api/:id` edit route until T-05 builds the real form. Echoes the `id`
 * route param so routing can be proven to work ahead of the real page existing.
 *
 * @returns The placeholder UI.
 */
export const MockApiEditPlaceholder = () => {
	const { id } = useParams<{ id: string }>();

	return (
		<Box sx={{ p: 4 }}>
			<Typography variant="body1">
				Mock API edit ({id}) — placeholder, T-05 will replace this
			</Typography>
		</Box>
	);
};

/**
 * Stands in for the `/http-rules` route. Unlike the `/mock-api/*` placeholders above, this one is
 * intentionally permanent — HTTP rules forms are out of scope for this feature entirely.
 *
 * @returns The placeholder UI.
 */
export const HttpRulesPlaceholder = () => (
	<Box sx={{ p: 4 }}>
		<Typography variant="body1">HTTP Rules — not yet implemented</Typography>
	</Box>
);
