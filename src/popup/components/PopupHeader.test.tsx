import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopupHeader } from './PopupHeader';

jest.mock('../../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp } from '../../shared/chrome/openApp';

describe('PopupHeader', () => {
	it('renders the logo image with the expected src and alt text', () => {
		render(<PopupHeader isRunning={false} onRunningChange={jest.fn()} />);
		const logo = screen.getByRole('img', { name: /devtools plus/i });
		expect(logo).toHaveAttribute('src', 'public/icons/icon32.png');
		expect(logo).toHaveAccessibleName();
	});

	it('renders the switch as checked and shows the running label when isRunning is true', () => {
		render(<PopupHeader isRunning={true} onRunningChange={jest.fn()} />);
		expect(screen.getByRole('switch', { name: /master switch/i })).toBeChecked();
		expect(screen.getByText('DevTools Plus running')).toBeInTheDocument();
	});

	it('renders the switch as unchecked and shows the off label when isRunning is false', () => {
		render(<PopupHeader isRunning={false} onRunningChange={jest.fn()} />);
		expect(screen.getByRole('switch', { name: /master switch/i })).not.toBeChecked();
		expect(screen.getByText('DevTools Plus off')).toBeInTheDocument();
	});

	it('calls onRunningChange with true when toggled on', async () => {
		const onRunningChange = jest.fn();
		render(<PopupHeader isRunning={false} onRunningChange={onRunningChange} />);
		await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));
		expect(onRunningChange).toHaveBeenCalledTimes(1);
		expect(onRunningChange).toHaveBeenCalledWith(true);
	});

	it('calls onRunningChange with false when toggled off', async () => {
		const onRunningChange = jest.fn();
		render(<PopupHeader isRunning={true} onRunningChange={onRunningChange} />);
		await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));
		expect(onRunningChange).toHaveBeenCalledTimes(1);
		expect(onRunningChange).toHaveBeenCalledWith(false);
	});

	it('renders the Open App button', () => {
		render(<PopupHeader isRunning={false} onRunningChange={jest.fn()} />);
		expect(screen.getByRole('button', { name: /open app/i })).toBeInTheDocument();
	});

	it('calls openApp when clicked', async () => {
		render(<PopupHeader isRunning={false} onRunningChange={jest.fn()} />);
		await userEvent.click(screen.getByRole('button', { name: /open app/i }));
		expect(openApp).toHaveBeenCalledTimes(1);
	});
});
