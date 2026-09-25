import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelToolbar } from './PanelToolbar';

jest.mock('../../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp, type AppPage } from '../../shared/chrome/openApp';

interface RenderOverrides {
	page?: AppPage;
	onExport?: jest.Mock;
	onImport?: jest.Mock;
}

const renderToolbar = (overrides: RenderOverrides = {}) => {
	const onExport = overrides.onExport ?? jest.fn();
	const onImport = overrides.onImport ?? jest.fn();
	const page = overrides.page ?? 'mock-api';
	render(<PanelToolbar page={page} onExport={onExport} onImport={onImport} />);
	return { onExport, onImport };
};

describe('PanelToolbar', () => {
	it('renders the Add button with its label and OpenInNewIcon', () => {
		renderToolbar();
		const addButton = screen.getByRole('button', { name: 'Add' });
		expect(addButton).toBeInTheDocument();
		expect(screen.getByTestId('OpenInNewIcon')).toBeInTheDocument();
	});

	it.each<AppPage>(['mock-api', 'http-rules'])(
		'calls openApp exactly once with the "%s" page when the Add button is clicked',
		async (page) => {
			const openAppMock = openApp as jest.Mock;
			openAppMock.mockClear();

			renderToolbar({ page });
			await userEvent.click(screen.getByRole('button', { name: 'Add' }));

			expect(openAppMock).toHaveBeenCalledTimes(1);
			expect(openAppMock).toHaveBeenCalledWith(page);
		},
	);

	it('renders the Export and Import buttons alongside Add and Actions', () => {
		renderToolbar();
		expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Open actions menu' })).toBeInTheDocument();
	});

	it('calls onExport exactly once when Export is clicked, without affecting onImport or the Actions menu', async () => {
		const { onExport, onImport } = renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Export' }));

		// onClick={onExport} is wired directly (unlike Add's onClick={() =>
		// openApp(page)}), so the handler receives the native click event as its
		// argument — asserting call count, not argument shape, is what matters here.
		expect(onExport).toHaveBeenCalledTimes(1);
		expect(onImport).not.toHaveBeenCalled();
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('calls onImport exactly once when Import is clicked, without affecting onExport or the Actions menu', async () => {
		const { onExport, onImport } = renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));

		expect(onImport).toHaveBeenCalledTimes(1);
		expect(onExport).not.toHaveBeenCalled();
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('renders the Actions button closed by default with ExpandMoreIcon and the correct aria-label', () => {
		renderToolbar();
		const button = screen.getByRole('button', { name: 'Open actions menu' });
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent('Actions');
		expect(screen.getByTestId('ExpandMoreIcon')).toBeInTheDocument();
		expect(screen.queryByTestId('ExpandLessIcon')).not.toBeInTheDocument();
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('opens the menu, flips the chevron, and updates the aria-label when the Actions button is clicked', async () => {
		renderToolbar();
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
		renderToolbar();
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

			renderToolbar();
			await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));
			await userEvent.click(screen.getByRole('menuitem', { name: label }));

			expect(openAppMock).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole('menu')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Open actions menu' })).toBeInTheDocument();
		},
	);
});
