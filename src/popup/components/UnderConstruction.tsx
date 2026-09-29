import { Box, Typography } from '@mui/material';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';

interface UnderConstructionProps {
	headline: string;
	body: string;
}

/**
 * Placeholder shown in place of a panel's toolbar and item list when the feature itself
 * isn't built yet (as opposed to `EmptyState`, which is for a built feature with no items).
 *
 * @param props.headline - The bold headline text.
 * @param props.body - The supporting body text.
 * @returns The under-construction UI.
 */
export const UnderConstruction = ({ headline, body }: UnderConstructionProps) => (
	<Box
		sx={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			textAlign: 'center',
			gap: 1,
			flex: 1,
			py: 4,
		}}
	>
		<ConstructionOutlinedIcon fontSize="large" color="disabled" />
		<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
			{headline}
		</Typography>
		<Typography variant="body2" color="text.secondary">
			{body}
		</Typography>
	</Box>
);
