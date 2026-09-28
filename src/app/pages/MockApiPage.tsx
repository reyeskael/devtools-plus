import { Alert, Box, Button, List, Snackbar, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useItemsState } from '../../shared/hooks/useItemsState';
import { MockApiRow } from './MockApiRow';

interface SaveFeedback {
	severity: 'success';
	message: string;
}

/**
 * The `/mock-api` list page: a heading, an "Add" button that navigates to the create route,
 * the list of mock responses (via `MockApiRow`), an empty state when there are none, and a
 * save-confirmation snackbar driven by the `?saved=1` query param the editor page navigates
 * back with.
 *
 * @returns The Mock APIs list page UI.
 */
export const MockApiPage = () => {
	const { mockResponses } = useItemsState();
	const [, setLocation] = useLocation();
	const search = useSearch();
	const [feedback, setFeedback] = useState<SaveFeedback | null>(null);

	// The ref guard satisfies the react-hooks/set-state-in-effect lint rule; it doesn't change
	// behavior, since `search` only contains `saved=1` for this one, initial navigation anyway.
	const hasShownSavedFeedbackRef = useRef(false);
	useEffect(() => {
		if (search.includes('saved=1') && !hasShownSavedFeedbackRef.current) {
			hasShownSavedFeedbackRef.current = true;
			setFeedback({ severity: 'success', message: 'Mock response saved' });
			setLocation('/mock-api', { replace: true });
		}
	}, [search, setLocation]);

	return (
		<Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<Typography variant="h5">Mock APIs</Typography>
				<Button variant="contained" onClick={() => setLocation('/mock-api/new')}>
					Add
				</Button>
			</Box>

			{mockResponses.length === 0 ? (
				<Typography variant="body1" color="text.secondary">
					No mock responses yet. Click Add to create one.
				</Typography>
			) : (
				<List>
					{mockResponses.map((item) => (
						<MockApiRow key={item.id} item={item} />
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
		</Box>
	);
};
