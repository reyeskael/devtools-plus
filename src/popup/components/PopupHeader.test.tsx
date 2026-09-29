import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopupHeader } from './PopupHeader';
import { ItemsStateContext } from '../../shared/context/ItemsStateContext';
import type { UseItemsState } from '../../shared/hooks/useItemsState';

jest.mock('../../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp } from '../../shared/chrome/openApp';

const buildItemsState = (overrides: Partial<UseItemsState> = {}): UseItemsState => ({
	mockResponses: [],
	httpRules: [],
	isRunning: false,
	hasHydrated: true,
	setRunning: jest.fn(),
	toggleItem: jest.fn(),
	removeItem: jest.fn(),
	replaceItems: jest.fn(),
	upsertMockResponse: jest.fn(),
	...overrides,
});

const renderHeader = (overrides: Partial<UseItemsState> = {}) => {
	const itemsState = buildItemsState(overrides);
	render(
		<ItemsStateContext.Provider value={itemsState}>
			<PopupHeader />
		</ItemsStateContext.Provider>,
	);
	return itemsState;
};

describe('PopupHeader', () => {
	it('renders the logo image with the expected src and alt text', () => {
		renderHeader({ isRunning: false });
		const logo = screen.getByRole('img', { name: /devtools plus/i });
		expect(logo).toHaveAttribute('src', 'public/icons/icon32.png');
		expect(logo).toHaveAccessibleName();
	});

	it('renders the switch as checked and shows the running label when isRunning is true', () => {
		renderHeader({ isRunning: true });
		expect(screen.getByRole('switch', { name: /master switch/i })).toBeChecked();
		expect(screen.getByText('DevTools Plus running')).toBeInTheDocument();
	});

	it('renders the switch as unchecked and shows the off label when isRunning is false', () => {
		renderHeader({ isRunning: false });
		expect(screen.getByRole('switch', { name: /master switch/i })).not.toBeChecked();
		expect(screen.getByText('DevTools Plus off')).toBeInTheDocument();
	});

	it('calls setRunning with true when toggled on', async () => {
		const { setRunning } = renderHeader({ isRunning: false });
		await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));
		expect(setRunning).toHaveBeenCalledTimes(1);
		expect(setRunning).toHaveBeenCalledWith(true);
	});

	it('calls setRunning with false when toggled off', async () => {
		const { setRunning } = renderHeader({ isRunning: true });
		await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));
		expect(setRunning).toHaveBeenCalledTimes(1);
		expect(setRunning).toHaveBeenCalledWith(false);
	});

	it('renders the Open App button', () => {
		renderHeader();
		expect(screen.getByRole('button', { name: /open app/i })).toBeInTheDocument();
	});

	it('calls openApp when clicked', async () => {
		renderHeader();
		await userEvent.click(screen.getByRole('button', { name: /open app/i }));
		expect(openApp).toHaveBeenCalledTimes(1);
	});
});
