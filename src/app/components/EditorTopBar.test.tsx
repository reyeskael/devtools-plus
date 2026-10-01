import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { EditorTopBar } from './EditorTopBar';

interface RenderOverrides {
	breadcrumbLabel?: string;
	onBreadcrumbBack?: jest.Mock;
	enabled?: boolean;
	onEnabledChange?: jest.Mock;
	onSave?: jest.Mock;
	overflowMenuItems?: ReactNode;
}

const renderTopBar = (overrides: RenderOverrides = {}) => {
	const onBreadcrumbBack = overrides.onBreadcrumbBack ?? jest.fn();
	const onEnabledChange = overrides.onEnabledChange ?? jest.fn();
	const onSave = overrides.onSave ?? jest.fn();
	render(
		<EditorTopBar
			rootBreadcrumbLabel="Mock APIs"
			breadcrumbLabel={overrides.breadcrumbLabel ?? 'New mock'}
			onBreadcrumbBack={onBreadcrumbBack}
			enabled={overrides.enabled ?? false}
			onEnabledChange={onEnabledChange}
			onSave={onSave}
			overflowMenuItems={overrides.overflowMenuItems}
		/>,
	);
	return { onBreadcrumbBack, onEnabledChange, onSave };
};

describe('EditorTopBar', () => {
	it('renders the breadcrumb with "Mock APIs" and the given label', () => {
		renderTopBar({ breadcrumbLabel: 'New mock' });
		expect(screen.getByRole('button', { name: 'Mock APIs' })).toBeInTheDocument();
		expect(screen.getByText('New mock')).toBeInTheDocument();
	});

	it('renders the given rootBreadcrumbLabel instead of a hardcoded string', () => {
		render(
			<EditorTopBar
				rootBreadcrumbLabel="Redirect Rules"
				breadcrumbLabel="New redirect rule"
				enabled={false}
				onEnabledChange={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: 'Redirect Rules' })).toBeInTheDocument();
		expect(screen.queryByText('Mock APIs')).not.toBeInTheDocument();
	});

	it('calls onBreadcrumbBack when the "Mock APIs" breadcrumb is clicked', async () => {
		const { onBreadcrumbBack } = renderTopBar();
		await userEvent.click(screen.getByRole('button', { name: 'Mock APIs' }));
		expect(onBreadcrumbBack).toHaveBeenCalledTimes(1);
	});

	it('does not throw when the "Mock APIs" breadcrumb is clicked without an onBreadcrumbBack handler', async () => {
		render(
			<EditorTopBar
				rootBreadcrumbLabel="Mock APIs"
				breadcrumbLabel="New mock"
				enabled={false}
				onEnabledChange={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		await expect(
			userEvent.click(screen.getByRole('button', { name: 'Mock APIs' })),
		).resolves.not.toThrow();
	});

	it('renders the Enabled switch as checked or unchecked based on the enabled prop', () => {
		const { rerender } = render(
			<EditorTopBar
				rootBreadcrumbLabel="Mock APIs"
				breadcrumbLabel="New mock"
				enabled={true}
				onEnabledChange={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: 'Enabled' })).toBeChecked();

		rerender(
			<EditorTopBar
				rootBreadcrumbLabel="Mock APIs"
				breadcrumbLabel="New mock"
				enabled={false}
				onEnabledChange={jest.fn()}
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: 'Enabled' })).not.toBeChecked();
	});

	it('calls onEnabledChange with the new checked state when the switch is toggled', async () => {
		const { onEnabledChange } = renderTopBar({ enabled: false });
		await userEvent.click(screen.getByRole('switch', { name: 'Enabled' }));
		expect(onEnabledChange).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledWith(true);
	});

	it('calls onSave when the Save button is clicked', async () => {
		const { onSave } = renderTopBar();
		await userEvent.click(screen.getByRole('button', { name: 'Save' }));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('does not render the overflow menu button when overflowMenuItems is not provided', () => {
		renderTopBar({ overflowMenuItems: undefined });
		expect(screen.queryByRole('button', { name: /more menu/i })).not.toBeInTheDocument();
	});

	it('renders the overflow menu button and its items when overflowMenuItems is provided', async () => {
		renderTopBar({ overflowMenuItems: <li role="menuitem">Delete</li> });

		const menuButton = screen.getByRole('button', { name: 'Open more menu' });
		expect(menuButton).toBeInTheDocument();

		await userEvent.click(menuButton);
		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
		// MUI's Modal marks background siblings aria-hidden while the menu is open,
		// so the button is queried directly rather than via role/accessible name here.
		expect(menuButton).toHaveAttribute('aria-label', 'Close more menu');
	});
});
