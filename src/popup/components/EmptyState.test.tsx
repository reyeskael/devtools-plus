import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
	it('renders the headline text', () => {
		render(
			<EmptyState
				headline="No pinned tools yet"
				body="Pin your favorite tools for quick access."
				actionLabel="Browse tools"
				onAction={jest.fn()}
			/>,
		);
		expect(screen.getByText('No pinned tools yet')).toBeInTheDocument();
	});

	it('renders the body text', () => {
		render(
			<EmptyState
				headline="No pinned tools yet"
				body="Pin your favorite tools for quick access."
				actionLabel="Browse tools"
				onAction={jest.fn()}
			/>,
		);
		expect(screen.getByText('Pin your favorite tools for quick access.')).toBeInTheDocument();
	});

	it('renders the action button with the given actionLabel', () => {
		render(
			<EmptyState
				headline="No pinned tools yet"
				body="Pin your favorite tools for quick access."
				actionLabel="Browse tools"
				onAction={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: 'Browse tools' })).toBeInTheDocument();
	});

	it('calls onAction exactly once when the button is clicked', async () => {
		const onAction = jest.fn();
		render(
			<EmptyState
				headline="No pinned tools yet"
				body="Pin your favorite tools for quick access."
				actionLabel="Browse tools"
				onAction={onAction}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: 'Browse tools' }));
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it('renders entirely different copy and label when given different props, proving it is generic', () => {
		const onAction = jest.fn();
		render(
			<EmptyState
				headline="No active tools"
				body="Start a tool to see it appear here."
				actionLabel="View all tools"
				onAction={onAction}
			/>,
		);
		expect(screen.getByText('No active tools')).toBeInTheDocument();
		expect(screen.getByText('Start a tool to see it appear here.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'View all tools' })).toBeInTheDocument();
		expect(screen.queryByText('No pinned tools yet')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Browse tools' })).not.toBeInTheDocument();
	});

	it('calls the onAction handler passed for a second, differently-labeled instance when clicked', async () => {
		const onAction = jest.fn();
		render(
			<EmptyState
				headline="All caught up"
				body="Nothing to show right now."
				actionLabel="Refresh"
				onAction={onAction}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
		expect(onAction).toHaveBeenCalledTimes(1);
	});
});
