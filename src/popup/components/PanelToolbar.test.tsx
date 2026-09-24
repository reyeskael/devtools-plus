import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelToolbar } from './PanelToolbar';

jest.mock('../../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp, type AppPage } from '../../shared/chrome/openApp';

describe('PanelToolbar', () => {
	it('renders the Add button with its label and OpenInNewIcon', () => {
		render(<PanelToolbar page="mock-api" />);
		const addButton = screen.getByRole('button', { name: 'Add' });
		expect(addButton).toBeInTheDocument();
		expect(screen.getByTestId('OpenInNewIcon')).toBeInTheDocument();
	});

	it.each<AppPage>(['mock-api', 'http-rules'])(
		'calls openApp exactly once with the "%s" page when the Add button is clicked',
		async (page) => {
			const openAppMock = openApp as jest.Mock;
			openAppMock.mockClear();

			render(<PanelToolbar page={page} />);
			await userEvent.click(screen.getByRole('button', { name: 'Add' }));

			expect(openAppMock).toHaveBeenCalledTimes(1);
			expect(openAppMock).toHaveBeenCalledWith(page);
		},
	);

	it('renders the Add button alongside the Actions button', () => {
		render(<PanelToolbar page="mock-api" />);
		expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open actions menu' })).toBeInTheDocument();
	});

	it('renders the Actions button closed by default with ExpandMoreIcon and the correct aria-label', () => {
		render(<PanelToolbar page="mock-api" />);
		const button = screen.getByRole('button', { name: 'Open actions menu' });
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent('Actions');
		expect(screen.getByTestId('ExpandMoreIcon')).toBeInTheDocument();
		expect(screen.queryByTestId('ExpandLessIcon')).not.toBeInTheDocument();
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('opens the menu, flips the chevron, and updates the aria-label when the Actions button is clicked', async () => {
		render(<PanelToolbar page="mock-api" />);
		const button = screen.getByRole('button', { name: 'Open actions menu' });
		await userEvent.click(button);

		expect(screen.getByRole('menu')).toBeInTheDocument();
		expect(screen.getByTestId('ExpandLessIcon')).toBeInTheDocument();
		expect(screen.queryByTestId('ExpandMoreIcon')).not.toBeInTheDocument();
		// MUI's Modal marks background siblings aria-hidden while the menu is open,
		// so the button is queried directly rather than via role/accessible name here.
		expect(button).toHaveAttribute('aria-label', 'Close actions menu');
	});

	it('renders the expected menu items in order, with a divider before the last item', async () => {
		render(<PanelToolbar page="mock-api" />);
		await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));

		const menuItems = screen.getAllByRole('menuitem');
		expect(menuItems).toHaveLength(4);
		expect(menuItems[0]).toHaveTextContent('Manage tools');
		expect(menuItems[1]).toHaveTextContent('Settings');
		expect(menuItems[2]).toHaveTextContent('Keyboard shortcuts');
		expect(menuItems[3]).toHaveTextContent('Open full app');

		const menu = screen.getByRole('menu');
		expect(screen.getByRole('separator')).toBeInTheDocument();

		const children = Array.from(menu.querySelectorAll('li, hr'));
		const separatorIndex = children.findIndex((el) => el.tagName.toLowerCase() === 'hr');
		const keyboardShortcutsIndex = children.findIndex((el) =>
			el.textContent?.includes('Keyboard shortcuts'),
		);
		const openFullAppIndex = children.findIndex((el) =>
			el.textContent?.includes('Open full app'),
		);

		expect(separatorIndex).toBeGreaterThan(keyboardShortcutsIndex);
		expect(separatorIndex).toBeLessThan(openFullAppIndex);
	});

	it.each([['Manage tools'], ['Settings'], ['Keyboard shortcuts'], ['Open full app']])(
		'calls openApp exactly once and closes the menu when "%s" is clicked',
		async (label) => {
			const openAppMock = openApp as jest.Mock;
			openAppMock.mockClear();

			render(<PanelToolbar page="mock-api" />);
			await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
			await userEvent.click(screen.getByRole('menuitem', { name: label }));

			expect(openAppMock).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole('menu')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Open actions menu' })).toBeInTheDocument();
		},
	);
});
