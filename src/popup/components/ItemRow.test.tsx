import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemRow } from './ItemRow';
import { Tool } from '../../shared/tools/types';

const makeTool = (overrides: Partial<Tool> = {}): Tool => ({
	id: 'network-monitor',
	name: 'Network Monitor',
	icon: 'network',
	enabled: false,
	pinned: false,
	...overrides,
});

describe('ItemRow', () => {
	it('renders the icon resolved from the tool icon key', () => {
		render(
			<ItemRow
				tool={makeTool({ icon: 'network' })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('NetworkCheckOutlinedIcon')).toBeInTheDocument();
	});

	it('renders the tool name as text', () => {
		render(
			<ItemRow
				tool={makeTool({ name: 'Network Monitor' })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByText('Network Monitor')).toBeInTheDocument();
	});

	it('renders the outlined pin icon and a "Pin" label when the tool is not pinned', () => {
		render(
			<ItemRow
				tool={makeTool({ pinned: false })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('PushPinOutlinedIcon')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^pin network monitor$/i })).toBeInTheDocument();
	});

	it('renders the filled pin icon and an "Unpin" label when the tool is pinned', () => {
		render(
			<ItemRow
				tool={makeTool({ pinned: true })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByTestId('PushPinIcon')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^unpin network monitor$/i })).toBeInTheDocument();
	});

	it('renders the switch as checked when the tool is enabled', () => {
		render(
			<ItemRow
				tool={makeTool({ enabled: true })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).toBeChecked();
	});

	it('renders the switch as unchecked when the tool is disabled', () => {
		render(
			<ItemRow
				tool={makeTool({ enabled: false })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).not.toBeChecked();
	});

	it('calls onTogglePin with the tool id when the pin button is clicked', async () => {
		const onTogglePin = jest.fn();
		render(
			<ItemRow
				tool={makeTool({ id: 'network-monitor', pinned: false })}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={onTogglePin}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: /^pin network monitor$/i }));
		expect(onTogglePin).toHaveBeenCalledTimes(1);
		expect(onTogglePin).toHaveBeenCalledWith('network-monitor');
	});

	it('calls onToggleEnabled with the tool id when the switch is toggled', async () => {
		const onToggleEnabled = jest.fn();
		render(
			<ItemRow
				tool={makeTool({ id: 'network-monitor', enabled: false })}
				isRunning={true}
				onToggleEnabled={onToggleEnabled}
				onTogglePin={jest.fn()}
			/>,
		);
		await userEvent.click(screen.getByRole('switch', { name: /network monitor switch/i }));
		expect(onToggleEnabled).toHaveBeenCalledTimes(1);
		expect(onToggleEnabled).toHaveBeenCalledWith('network-monitor');
	});

	it('disables the pin button and switch when isRunning is false', () => {
		render(
			<ItemRow
				tool={makeTool()}
				isRunning={false}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: /^pin network monitor$/i })).toBeDisabled();
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).toBeDisabled();
	});

	it('does not disable the pin button and switch when isRunning is true', () => {
		render(
			<ItemRow
				tool={makeTool()}
				isRunning={true}
				onToggleEnabled={jest.fn()}
				onTogglePin={jest.fn()}
			/>,
		);
		expect(screen.getByRole('button', { name: /^pin network monitor$/i })).not.toBeDisabled();
		expect(screen.getByRole('switch', { name: /network monitor switch/i })).not.toBeDisabled();
	});

	it('does not call onTogglePin or onToggleEnabled when controls are disabled', async () => {
		const onTogglePin = jest.fn();
		const onToggleEnabled = jest.fn();
		render(
			<ItemRow
				tool={makeTool()}
				isRunning={false}
				onToggleEnabled={onToggleEnabled}
				onTogglePin={onTogglePin}
			/>,
		);

		await userEvent.click(screen.getByRole('button', { name: /^pin network monitor$/i }), {
			pointerEventsCheck: 0,
		});
		await userEvent.click(screen.getByRole('switch', { name: /network monitor switch/i }), {
			pointerEventsCheck: 0,
		});

		expect(onTogglePin).toHaveBeenCalledTimes(0);
		expect(onToggleEnabled).toHaveBeenCalledTimes(0);
	});
});
