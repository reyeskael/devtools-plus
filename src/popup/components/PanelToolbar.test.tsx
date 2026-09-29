import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelToolbar } from './PanelToolbar';
import { ItemsStateContext } from '../context/ItemsStateContext';
import type { UseItemsState } from '../../shared/hooks/useItemsState';
import type { HttpRuleItem, MockResponseItem } from '../../shared/items/types';

jest.mock('../../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

jest.mock('../../shared/files/downloadJson', () => ({
	...jest.requireActual('../../shared/files/downloadJson'),
	downloadJson: jest.fn(),
}));

import { openApp, type AppPage } from '../../shared/chrome/openApp';
import { downloadJson } from '../../shared/files/downloadJson';

const mockResponse: MockResponseItem = {
	id: 'mr-1',
	name: 'Get users',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/users',
	statusCode: 200,
};

const httpRule: HttpRuleItem = {
	id: 'hr-1',
	name: 'Block analytics',
	kind: 'http-rule',
	enabled: true,
	action: 'block',
	urlPattern: '/analytics',
};

interface RenderOverrides {
	page?: AppPage;
	mockResponses?: MockResponseItem[];
	httpRules?: HttpRuleItem[];
	replaceItems?: jest.Mock;
}

const buildItemsState = (overrides: Partial<UseItemsState> = {}): UseItemsState => ({
	mockResponses: [mockResponse],
	httpRules: [httpRule],
	isRunning: true,
	hasHydrated: true,
	setRunning: jest.fn(),
	toggleItem: jest.fn(),
	removeItem: jest.fn(),
	replaceItems: jest.fn(),
	upsertMockResponse: jest.fn(),
	...overrides,
});

const renderToolbar = (overrides: RenderOverrides = {}) => {
	const page = overrides.page ?? 'mock-api';
	const itemsState = buildItemsState({
		...(overrides.mockResponses !== undefined && { mockResponses: overrides.mockResponses }),
		...(overrides.httpRules !== undefined && { httpRules: overrides.httpRules }),
		...(overrides.replaceItems !== undefined && { replaceItems: overrides.replaceItems }),
	});
	render(
		<ItemsStateContext.Provider value={itemsState}>
			<PanelToolbar page={page} />
		</ItemsStateContext.Provider>,
	);
	return { replaceItems: itemsState.replaceItems as jest.Mock };
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

	it('clicking Export downloads the mock responses and http rules as one JSON payload', async () => {
		renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Export' }));

		expect(downloadJson).toHaveBeenCalledTimes(1);
		const [filename, payload] = (downloadJson as jest.Mock).mock.calls[0];
		expect(filename).toMatch(/^devtools-plus-items-\d{4}-\d{2}-\d{2}\.json$/);
		expect(JSON.parse(payload as string)).toEqual([mockResponse, httpRule]);
	});

	it('clicking Import opens the import dialog, without triggering Export', async () => {
		renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(downloadJson).not.toHaveBeenCalled();
	});

	it('pastes valid JSON, calls replaceItems, shows a success message, and closes the dialog', async () => {
		const { replaceItems } = renderToolbar();
		const validMockPayload = JSON.stringify([
			{ ...mockResponse, id: 'new-mock-1', name: 'New Mock' },
		]);

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));
		const dialog = screen.getByRole('dialog');
		fireEvent.change(within(dialog).getByPlaceholderText('[ ... ]'), {
			target: { value: validMockPayload },
		});
		await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

		expect(replaceItems).toHaveBeenCalledTimes(1);
		expect(replaceItems).toHaveBeenCalledWith(
			[{ ...mockResponse, id: 'new-mock-1', name: 'New Mock' }],
			undefined,
		);
		expect(
			await screen.findByText('Imported 1 mock responses, 0 HTTP rules'),
		).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	it('pastes invalid JSON, shows an error message, and keeps the dialog open without calling replaceItems', async () => {
		const { replaceItems } = renderToolbar();

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));
		const dialog = screen.getByRole('dialog');
		fireEvent.change(within(dialog).getByPlaceholderText('[ ... ]'), {
			target: { value: 'not valid json' },
		});
		await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

		expect(await screen.findByText(/Invalid JSON/)).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(replaceItems).not.toHaveBeenCalled();
	});
});
