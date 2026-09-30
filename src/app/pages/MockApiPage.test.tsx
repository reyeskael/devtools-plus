import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { MockApiPage } from './MockApiPage';
import { ItemsStateProvider } from '../../shared/context/ItemsStateContext';
import type { MockResponseItem } from '../../shared/items/types';

const STORAGE_KEY = 'popupItemsState';

const fixtureMockResponses: MockResponseItem[] = [
	{
		id: 'mr-1',
		name: 'Get users',
		kind: 'mock-response',
		enabled: true,
		method: 'GET',
		urlPattern: '/api/users',
		statusCode: 200,
		statusText: 'OK',
	},
	{
		id: 'mr-2',
		name: 'Create user',
		kind: 'mock-response',
		enabled: false,
		method: 'POST',
		urlPattern: '/api/users/create',
		statusCode: 201,
	},
];

/** Renders `MockApiPage` at `path`, wired to an in-memory wouter location. */
const renderAtPath = (path: string) => {
	const { hook, history } = memoryLocation({ path, record: true });
	render(
		<ItemsStateProvider>
			<Router hook={hook}>
				<MockApiPage />
			</Router>
		</ItemsStateProvider>,
	);
	return { history: history as string[] };
};

describe('MockApiPage', () => {
	beforeEach(() => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: [], isRunning: true },
		});
	});

	it('renders the "Mock APIs" heading', () => {
		renderAtPath('/mock-api');
		expect(screen.getByRole('heading', { name: /mock apis/i })).toBeInTheDocument();
	});

	it('renders an Add button', () => {
		renderAtPath('/mock-api');
		expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
	});

	it('navigates to /mock-api/new when Add is clicked', async () => {
		const { history } = renderAtPath('/mock-api');
		await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
		expect(history.at(-1)).toBe('/mock-api/new');
	});

	it('renders an empty state when there are no mock responses', () => {
		renderAtPath('/mock-api');
		expect(screen.getByText(/no mock responses yet/i)).toBeInTheDocument();
	});

	it('renders a row for each mock response with its discrete fields', () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: fixtureMockResponses, redirects: [], isRunning: true },
		});
		renderAtPath('/mock-api');
		expect(screen.getByText('Get users')).toBeInTheDocument();
		expect(screen.getByText('/api/users')).toBeInTheDocument();
		expect(screen.getByText('200 OK')).toBeInTheDocument();
		expect(screen.getByText('Create user')).toBeInTheDocument();
		expect(screen.getByText('201')).toBeInTheDocument();
	});

	it('does not render the empty state when there are mock responses', () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: fixtureMockResponses, redirects: [], isRunning: true },
		});
		renderAtPath('/mock-api');
		expect(screen.queryByText(/no mock responses yet/i)).not.toBeInTheDocument();
	});

	it('shows a save-confirmation snackbar when the path has ?saved=1 and strips the query param', () => {
		const { history } = renderAtPath('/mock-api?saved=1');
		expect(screen.getByText('Mock response saved')).toBeInTheDocument();
		expect(history.at(-1)).toBe('/mock-api');
	});

	it('does not show the save or delete snackbar when there is no ?saved=1/?deleted=1 query param', () => {
		renderAtPath('/mock-api');
		expect(screen.queryByText('Mock response saved')).not.toBeInTheDocument();
		expect(screen.queryByText('Mock response deleted')).not.toBeInTheDocument();
	});

	it('shows a delete-confirmation snackbar when the path has ?deleted=1 and strips the query param', () => {
		const { history } = renderAtPath('/mock-api?deleted=1');
		expect(screen.getByText('Mock response deleted')).toBeInTheDocument();
		expect(history.at(-1)).toBe('/mock-api');
	});

	it('navigates to /mock-api/{id} when a row edit button is clicked', async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: fixtureMockResponses, redirects: [], isRunning: true },
		});
		const { history } = renderAtPath('/mock-api');
		await userEvent.click(screen.getByRole('button', { name: `Edit ${fixtureMockResponses[0].name}` }));
		expect(history.at(-1)).toBe(`/mock-api/${fixtureMockResponses[0].id}`);
	});

	it('navigates to the specific row\'s id when a non-first row\'s edit button is clicked', async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: fixtureMockResponses, redirects: [], isRunning: true },
		});
		const { history } = renderAtPath('/mock-api');
		await userEvent.click(screen.getByRole('button', { name: `Edit ${fixtureMockResponses[1].name}` }));
		expect(history.at(-1)).toBe(`/mock-api/${fixtureMockResponses[1].id}`);
		expect(history.at(-1)).not.toBe(`/mock-api/${fixtureMockResponses[0].id}`);
	});

	it('toggles a row\'s enabled state via its switch without navigating', async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: fixtureMockResponses, redirects: [], isRunning: true },
		});
		const { history } = renderAtPath('/mock-api');
		const toggle = screen.getByRole('switch', { name: `${fixtureMockResponses[1].name} switch` });
		expect(toggle).not.toBeChecked();
		await userEvent.click(toggle);
		expect(toggle).toBeChecked();
		expect(history.at(-1)).toBe('/mock-api');
	});

	it('removes a row when its delete button is clicked, without navigating', async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: fixtureMockResponses, redirects: [], isRunning: true },
		});
		const { history } = renderAtPath('/mock-api');
		await userEvent.click(screen.getByRole('button', { name: `Delete ${fixtureMockResponses[0].name}` }));
		expect(screen.queryByText(fixtureMockResponses[0].name)).not.toBeInTheDocument();
		expect(screen.getByText(fixtureMockResponses[1].name)).toBeInTheDocument();
		expect(history.at(-1)).toBe('/mock-api');
	});
});
