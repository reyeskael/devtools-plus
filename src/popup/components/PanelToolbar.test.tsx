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

	it('renders the Export and Import buttons alongside Add', () => {
		renderToolbar();
		expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
	});

	it('calls onExport exactly once when Export is clicked, without affecting onImport', async () => {
		const { onExport, onImport } = renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Export' }));

		// onClick={onExport} is wired directly (unlike Add's onClick={() =>
		// openApp(page)}), so the handler receives the native click event as its
		// argument — asserting call count, not argument shape, is what matters here.
		expect(onExport).toHaveBeenCalledTimes(1);
		expect(onImport).not.toHaveBeenCalled();
	});

	it('calls onImport exactly once when Import is clicked, without affecting onExport', async () => {
		const { onExport, onImport } = renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));

		expect(onImport).toHaveBeenCalledTimes(1);
		expect(onExport).not.toHaveBeenCalled();
	});
});
