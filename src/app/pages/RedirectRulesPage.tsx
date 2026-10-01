import { Alert, Box, Button, Container, List, Snackbar, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useItemsStateContext } from '../../shared/context/ItemsStateContext';
import { RedirectRuleRow } from './RedirectRuleRow';

interface SaveFeedback {
	severity: 'success';
	message: string;
}

/**
 * The `/redirects` list page: a heading, an "Add" button that navigates to the create route,
 * the list of redirect rules (via `RedirectRuleRow`), an empty state when there are none, and a
 * confirmation snackbar driven by the `?saved=1`/`?deleted=1` query params the editor page
 * navigates back with.
 *
 * @returns The Redirect Rules list page UI.
 */
export const RedirectRulesPage = () => {
	const { redirects, toggleItem, removeItem } = useItemsStateContext();
	const [, setLocation] = useLocation();
	const search = useSearch();
	const [feedback, setFeedback] = useState<SaveFeedback | null>(null);

	// The ref guard satisfies the react-hooks/set-state-in-effect lint rule; it doesn't change
	// behavior, since `search` only contains these params for this one, initial navigation anyway.
	const hasShownFeedbackRef = useRef(false);
	useEffect(() => {
		if (search.includes('saved=1') && !hasShownFeedbackRef.current) {
			hasShownFeedbackRef.current = true;
			setFeedback({ severity: 'success', message: 'Redirect rule saved' });
			setLocation('/redirects', { replace: true });
		} else if (search.includes('deleted=1') && !hasShownFeedbackRef.current) {
			hasShownFeedbackRef.current = true;
			setFeedback({ severity: 'success', message: 'Redirect rule deleted' });
			setLocation('/redirects', { replace: true });
		}
	}, [search, setLocation]);

	return (
		<Container maxWidth="lg" sx={{ py: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<Typography variant="h5">Redirect Rules</Typography>
				<Button variant="contained" onClick={() => setLocation('/redirects/new')}>
					Add
				</Button>
			</Box>

			{redirects.length === 0 ? (
				<Typography variant="body1" color="text.secondary">
					No redirect rules yet. Click Add to create one.
				</Typography>
			) : (
				<List>
					{redirects.map((item) => (
						<RedirectRuleRow
							key={item.id}
							item={item}
							onEdit={(id) => setLocation(`/redirects/${id}`)}
							onToggle={(id) => toggleItem('redirect', id)}
							onDelete={(id) => removeItem('redirect', id)}
						/>
					))}
				</List>
			)}

			<Snackbar
				open={feedback !== null}
				autoHideDuration={4000}
				onClose={() => setFeedback(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				{feedback ? (
					<Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
						{feedback.message}
					</Alert>
				) : undefined}
			</Snackbar>
		</Container>
	);
};
