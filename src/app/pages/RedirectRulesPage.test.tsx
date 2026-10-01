import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { RedirectRulesPage } from './RedirectRulesPage';
import { ItemsStateProvider } from '../../shared/context/ItemsStateContext';
import type { RedirectRuleItem } from '../../shared/items/types';

const STORAGE_KEY = 'popupItemsState';

const fixtureRedirects: RedirectRuleItem[] = [
	{
		id: 'redirect-1',
		name: 'Old API redirect',
		kind: 'redirect',
		enabled: true,
		matchType: 'wildcard',
		urlPattern: '/api/v1/*',
		destination: 'https://example.com/v2/$1',
		methods: ['GET'],
	},
	{
		id: 'redirect-2',
		name: 'Static asset redirect',
		kind: 'redirect',
		enabled: false,
		matchType: 'wildcard',
		urlPattern: '*.js',
		destination: 'https://localhost:3000/$1',
	},
];

/** Renders `RedirectRulesPage` at `path`, wired to an in-memory wouter location. */
const renderAtPath = (path: string) => {
	const { hook, history } = memoryLocation({ path, record: true });
	render(
		<ItemsStateProvider>
			<Router hook={hook}>
				<RedirectRulesPage />
			</Router>
		</ItemsStateProvider>,
	);
	return { history: history as string[] };
};

describe('RedirectRulesPage', () => {
	beforeEach(() => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: [], isRunning: true },
		});
	});

	it('renders the "Redirect Rules" heading', () => {
		renderAtPath('/redirects');
		expect(screen.getByRole('heading', { name: /redirect rules/i })).toBeInTheDocument();
	});

	it('renders an Add button', () => {
		renderAtPath('/redirects');
		expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
	});

	it('navigates to /redirects/new when Add is clicked', async () => {
		const { history } = renderAtPath('/redirects');
		await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
		expect(history.at(-1)).toBe('/redirects/new');
	});

	it('renders an empty state when there are no redirect rules', () => {
		renderAtPath('/redirects');
		expect(screen.getByText(/no redirect rules yet/i)).toBeInTheDocument();
	});

	it('renders a row for each redirect rule with its summary', () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: fixtureRedirects, isRunning: true },
		});
		renderAtPath('/redirects');
		expect(screen.getByText('Old API redirect')).toBeInTheDocument();
		expect(screen.getByText('GET /api/v1/* → https://example.com/v2/$1')).toBeInTheDocument();
		expect(screen.getByText('Static asset redirect')).toBeInTheDocument();
		expect(screen.getByText('ALL *.js → https://localhost:3000/$1')).toBeInTheDocument();
	});

	it('does not render the empty state when there are redirect rules', () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: fixtureRedirects, isRunning: true },
		});
		renderAtPath('/redirects');
		expect(screen.queryByText(/no redirect rules yet/i)).not.toBeInTheDocument();
	});

	it('shows a save-confirmation snackbar when the path has ?saved=1 and replaces (not pushes) the location', () => {
		const { history } = renderAtPath('/redirects?saved=1');
		expect(screen.getByText('Redirect rule saved')).toBeInTheDocument();
		// Asserting the full history array (not just its last entry) confirms the navigation used
		// `replace: true` rather than pushing a new entry on top of `/redirects?saved=1` — both
		// would leave `history.at(-1)` as `/redirects`, but only `replace` collapses it to a single
		// entry.
		expect(history).toEqual(['/redirects']);
	});

	it('does not show the save or delete snackbar when there is no ?saved=1/?deleted=1 query param', () => {
		renderAtPath('/redirects');
		expect(screen.queryByText('Redirect rule saved')).not.toBeInTheDocument();
		expect(screen.queryByText('Redirect rule deleted')).not.toBeInTheDocument();
	});

	it('shows a delete-confirmation snackbar when the path has ?deleted=1 and replaces (not pushes) the location', () => {
		const { history } = renderAtPath('/redirects?deleted=1');
		expect(screen.getByText('Redirect rule deleted')).toBeInTheDocument();
		expect(history).toEqual(['/redirects']);
	});

	it('navigates to /redirects/{id} when a row edit button is clicked', async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: fixtureRedirects, isRunning: true },
		});
		const { history } = renderAtPath('/redirects');
		await userEvent.click(
			screen.getByRole('button', { name: `Edit ${fixtureRedirects[0].name}` }),
		);
		expect(history.at(-1)).toBe(`/redirects/${fixtureRedirects[0].id}`);
	});

	it("navigates to the specific row's id when a non-first row's edit button is clicked", async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: fixtureRedirects, isRunning: true },
		});
		const { history } = renderAtPath('/redirects');
		await userEvent.click(
			screen.getByRole('button', { name: `Edit ${fixtureRedirects[1].name}` }),
		);
		expect(history.at(-1)).toBe(`/redirects/${fixtureRedirects[1].id}`);
		expect(history.at(-1)).not.toBe(`/redirects/${fixtureRedirects[0].id}`);
	});

	it("toggles a row's enabled state via its switch without navigating", async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: fixtureRedirects, isRunning: true },
		});
		const { history } = renderAtPath('/redirects');
		const toggle = screen.getByRole('switch', { name: `${fixtureRedirects[1].name} switch` });
		expect(toggle).not.toBeChecked();
		await userEvent.click(toggle);
		expect(toggle).toBeChecked();
		expect(history.at(-1)).toBe('/redirects');
	});

	it('removes a row when its delete button is clicked, without navigating', async () => {
		chrome.storage.local.set({
			[STORAGE_KEY]: { mockResponses: [], redirects: fixtureRedirects, isRunning: true },
		});
		const { history } = renderAtPath('/redirects');
		await userEvent.click(
			screen.getByRole('button', { name: `Delete ${fixtureRedirects[0].name}` }),
		);
		expect(screen.queryByText(fixtureRedirects[0].name)).not.toBeInTheDocument();
		expect(screen.getByText(fixtureRedirects[1].name)).toBeInTheDocument();
		expect(history.at(-1)).toBe('/redirects');
	});
});
