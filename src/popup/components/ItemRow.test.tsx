import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemRow, ItemRowViewModel } from './ItemRow';

const makeItem = (overrides: Partial<ItemRowViewModel> = {}): ItemRowViewModel => ({
	id: 'network-monitor',
	label: 'Network Monitor',
	secondary: 'Monitors network traffic',
	enabled: false,
	...overrides,
});

describe('ItemRow', () => {
	it('renders the item label as the primary text', () => {
		render(
			<ItemRow
				item={makeItem({ label: 'Network Monitor' })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('Network Monitor')).toBeInTheDocument();
	});

	it('renders the item secondary text', () => {
		render(
			<ItemRow
				item={makeItem({ secondary: 'Monitors network traffic' })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByText('Monitors network traffic')).toBeInTheDocument();
	});

	it('renders the delete button with the correct aria-label and icon', () => {
		render(
			<ItemRow
				item={makeItem({ label: 'Network Monitor' })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(
			screen.getByRole('button', { name: /^delete network monitor$/i }),
		).toBeInTheDocument();
		expect(screen.getByTestId('DeleteOutlinedIcon')).toBeInTheDocument();
	});

	it('calls onDelete with the item id when the delete button is clicked', async () => {
		const onDelete = jest.fn();
		render(
			<ItemRow
				item={makeItem({ id: 'network-monitor' })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={onDelete}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: /^delete network monitor$/i }));
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith('network-monitor');
	});

	it('renders the switch as checked when the item is enabled', () => {
		render(
			<ItemRow
				item={makeItem({ enabled: true })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).toBeChecked();
	});

	it('renders the switch as unchecked when the item is disabled', () => {
		render(
			<ItemRow
				item={makeItem({ enabled: false })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).not.toBeChecked();
	});

	it('calls onToggleEnabled with the item id when the switch is toggled', async () => {
		const onToggleEnabled = jest.fn();
		render(
			<ItemRow
				item={makeItem({ id: 'network-monitor', enabled: false })}
				isRunning={true}
				onToggleEnabled={onToggleEnabled}
				onDelete={jest.fn()}
			/>,
		);
		await userEvent.click(screen.getByRole('switch', { name: /network monitor switch/i }));
		expect(onToggleEnabled).toHaveBeenCalledTimes(1);
		expect(onToggleEnabled).toHaveBeenCalledWith('network-monitor');
	});

	it('disables the delete button and switch when isRunning is false', () => {
		render(
			<ItemRow
				item={makeItem()}
				isRunning={false}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: /^delete network monitor$/i })).toBeDisabled();
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).toBeDisabled();
	});

	it('does not disable the delete button and switch when isRunning is true', () => {
		render(
			<ItemRow
				item={makeItem()}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: /^delete network monitor$/i })).not.toBeDisabled();
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).not.toBeDisabled();
	});

	it('does not call onDelete or onToggleEnabled when controls are disabled', async () => {
		const onDelete = jest.fn();
		const onToggleEnabled = jest.fn();
		render(
			<ItemRow
				item={makeItem()}
				isRunning={false}
				onToggleEnabled={onToggleEnabled}
				onDelete={onDelete}
			/>,
		);

		await userEvent.click(screen.getByRole('button', { name: /^delete network monitor$/i }), {
			pointerEventsCheck: 0,
		});
		await userEvent.click(screen.getByRole('switch', { name: /network monitor switch/i }), {
			pointerEventsCheck: 0,
		});

		expect(onDelete).toHaveBeenCalledTimes(0);
		expect(onToggleEnabled).toHaveBeenCalledTimes(0);
	});
});
