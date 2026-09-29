import { Alert, Box, Button, Container, List, Snackbar, Typography } from '@mui/material';
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
 * confirmation snackbar driven by the `?saved=1`/`?deleted=1` query params the editor page
 * navigates back with.
 *
 * @returns The Mock APIs list page UI.
 */
export const MockApiPage = () => {
	const { mockResponses, toggleItem, removeItem } = useItemsState();
	const [, setLocation] = useLocation();
	const search = useSearch();
	const [feedback, setFeedback] = useState<SaveFeedback | null>(null);

	// The ref guard satisfies the react-hooks/set-state-in-effect lint rule; it doesn't change
	// behavior, since `search` only contains these params for this one, initial navigation anyway.
	const hasShownFeedbackRef = useRef(false);
	useEffect(() => {
		if (search.includes('saved=1') && !hasShownFeedbackRef.current) {
			hasShownFeedbackRef.current = true;
			setFeedback({ severity: 'success', message: 'Mock response saved' });
			setLocation('/mock-api', { replace: true });
		} else if (search.includes('deleted=1') && !hasShownFeedbackRef.current) {
			hasShownFeedbackRef.current = true;
			setFeedback({ severity: 'success', message: 'Mock response deleted' });
			setLocation('/mock-api', { replace: true });
		}
	}, [search, setLocation]);

	return (
		<Container maxWidth="lg" sx={{ py: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
						<MockApiRow
							key={item.id}
							item={item}
							onEdit={(id) => setLocation(`/mock-api/${id}`)}
							onToggle={(id) => toggleItem('mock-response', id)}
							onDelete={(id) => removeItem('mock-response', id)}
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
