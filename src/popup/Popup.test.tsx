import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popup } from './Popup';
import type { HttpRuleItem, MockResponseItem } from '../shared/items/types';

jest.mock('../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

jest.mock('../shared/files/downloadJson', () => ({
	...jest.requireActual('../shared/files/downloadJson'),
	downloadJson: jest.fn(),
}));

jest.mock('../shared/files/readFileAsText', () => ({
	...jest.requireActual('../shared/files/readFileAsText'),
	readFileAsText: jest.fn(jest.requireActual('../shared/files/readFileAsText').readFileAsText),
}));

import { openApp } from '../shared/chrome/openApp';
import { downloadJson } from '../shared/files/downloadJson';
import { readFileAsText } from '../shared/files/readFileAsText';

const STORAGE_KEY = 'popupItemsState';

// Local fixtures — seedMockResponses is now an empty array (mock responses
// come from Import, not a bundled seed), so these tests seed
// chrome.storage.local directly instead of depending on seedItems.ts.
const fixtureMockResponses: MockResponseItem[] = [
	{
		id: 'mr-1',
		name: 'Get users',
		kind: 'mock-response',
		enabled: true,
		method: 'GET',
		urlPattern: '/api/users',
		statusCode: 200,
	},
	{
		id: 'mr-2',
		name: 'Create user',
		kind: 'mock-response',
		enabled: false,
		method: 'POST',
		urlPattern: '/api/users',
		statusCode: 201,
	},
];

const fixtureHttpRules: HttpRuleItem[] = [
	{
		id: 'hr-1',
		name: 'Block ads',
		kind: 'http-rule',
		enabled: true,
		urlPattern: '/ads/*',
		action: 'block',
	},
	{
		id: 'hr-2',
		name: 'Redirect old',
		kind: 'http-rule',
		enabled: false,
		urlPattern: '/old',
		action: 'redirect',
		target: '/new',
	},
];

const rowSwitch = (name: string) =>
	screen.getByRole('switch', { name: new RegExp(`^${name} switch$`, 'i') });

const deleteButton = (name: string) =>
	screen.getByRole('button', { name: new RegExp(`^Delete ${name}$`, 'i') });

const addButton = () => screen.getByRole('button', { name: /^add$/i });

const mockResponsesTab = () => screen.getByRole('tab', { name: /api mock/i });

const httpRulesTab = () => screen.getByRole('tab', { name: /http rules/i });

const masterSwitch = () => screen.getByRole('switch', { name: /master switch/i });

const expectRowSwitchChecked = (name: string, checked: boolean) => {
	if (checked) {
		expect(rowSwitch(name)).toBeChecked();
	} else {
		expect(rowSwitch(name)).not.toBeChecked();
	}
};

describe('Popup', () => {
	beforeEach(() => {
		// The chrome.storage.local stub in jest.setup.ts backs onto a module-level
		// object that persists across tests within this file, so reset it (and the
		// mock call history) before every test to keep them independent. Because
		// the stub's get() resolves synchronously, seeding storage here means the
		// hook's hydration effect resolves within the same synchronous act() flush
		// that render() performs — no waitFor needed for the seeded data to show up.
		chrome.storage.local.set({
			[STORAGE_KEY]: {
				mockResponses: fixtureMockResponses,
				httpRules: fixtureHttpRules,
				isRunning: true,
			},
		});
		jest.clearAllMocks();
	});

	it('renders the Open App button', () => {
		render(<Popup />);
		expect(screen.getByRole('button', { name: /open app/i })).toBeInTheDocument();
	});

	it('calls openApp when the Open App button is clicked', async () => {
		render(<Popup />);
		await userEvent.click(screen.getByRole('button', { name: /open app/i }));
		expect(openApp).toHaveBeenCalledTimes(1);
		expect(openApp).toHaveBeenCalledWith();
	});

	it('renders the manifest version as a caption', () => {
		render(<Popup />);
		expect(screen.getByText('v0.1.0')).toBeInTheDocument();
	});

	describe('tabs', () => {
		it('renders exactly two tabs with the correct labels', () => {
			render(<Popup />);
			const tabs = screen.getAllByRole('tab');
			expect(tabs).toHaveLength(2);
			expect(tabs[0]).toHaveTextContent('API Mock');
			expect(tabs[1]).toHaveTextContent('HTTP Rules');
		});

		it('selects the API Mock tab by default', () => {
			render(<Popup />);
			expect(mockResponsesTab()).toHaveAttribute('aria-selected', 'true');
			expect(httpRulesTab()).toHaveAttribute('aria-selected', 'false');
		});
	});

	describe('cross-tab scoping', () => {
		it('shows the seeded mock responses only on the mock-responses tab', async () => {
			render(<Popup />);

			for (const item of fixtureMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
			for (const item of fixtureHttpRules) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}

			await userEvent.click(httpRulesTab());

			for (const item of fixtureMockResponses) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}
		});

		it('shows the seeded HTTP rules only on the http-rules tab', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());

			for (const item of fixtureHttpRules) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
			for (const item of fixtureMockResponses) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}

			await userEvent.click(mockResponsesTab());

			for (const item of fixtureHttpRules) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}
			for (const item of fixtureMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});
	});

	describe('add handler', () => {
		it('calls openApp with "mock-api" when Add is clicked on the mock-responses tab', async () => {
			render(<Popup />);
			await userEvent.click(addButton());
			expect(openApp).toHaveBeenCalledTimes(1);
			expect(openApp).toHaveBeenCalledWith('mock-api');
		});

		it('calls openApp with "http-rules" when Add is clicked on the http-rules tab', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());
			await userEvent.click(addButton());
			expect(openApp).toHaveBeenCalledTimes(1);
			expect(openApp).toHaveBeenCalledWith('http-rules');
		});

		it('calls openApp with "mock-api" from the empty-state action once every mock response is deleted', async () => {
			render(<Popup />);
			for (const item of fixtureMockResponses) {
				await userEvent.click(deleteButton(item.name));
			}

			await userEvent.click(screen.getByRole('button', { name: /add mock response/i }));

			expect(openApp).toHaveBeenCalledWith('mock-api');
		});

		it('calls openApp with "http-rules" from the empty-state action once every HTTP rule is deleted', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());
			for (const item of fixtureHttpRules) {
				await userEvent.click(deleteButton(item.name));
			}

			await userEvent.click(screen.getByRole('button', { name: /add http rule/i }));

			expect(openApp).toHaveBeenCalledWith('http-rules');
		});
	});

	describe('empty states', () => {
		it('shows the mock-responses empty-state copy once every mock response is deleted', async () => {
			render(<Popup />);
			for (const item of fixtureMockResponses) {
				await userEvent.click(deleteButton(item.name));
			}

			expect(screen.getByText('No mock responses yet')).toBeInTheDocument();
			expect(
				screen.getByText('Add a mock response in the full app to get started.'),
			).toBeInTheDocument();
		});

		it('shows the http-rules empty-state copy once every HTTP rule is deleted', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());
			for (const item of fixtureHttpRules) {
				await userEvent.click(deleteButton(item.name));
			}

			expect(screen.getByText('No HTTP rules yet')).toBeInTheDocument();
			expect(
				screen.getByText('Add an HTTP rule in the full app to get started.'),
			).toBeInTheDocument();
		});

		it('uses distinct empty-state copy for each tab', async () => {
			render(<Popup />);
			for (const item of fixtureMockResponses) {
				await userEvent.click(deleteButton(item.name));
			}
			const mockResponsesHeadline = screen.getByText('No mock responses yet').textContent;
			const mockResponsesBody = screen.getByText(
				'Add a mock response in the full app to get started.',
			).textContent;

			await userEvent.click(httpRulesTab());
			for (const item of fixtureHttpRules) {
				await userEvent.click(deleteButton(item.name));
			}
			const httpRulesHeadline = screen.getByText('No HTTP rules yet').textContent;
			const httpRulesBody = screen.getByText(
				'Add an HTTP rule in the full app to get started.',
			).textContent;

			expect(mockResponsesHeadline).not.toBe(httpRulesHeadline);
			expect(mockResponsesBody).not.toBe(httpRulesBody);
		});
	});

	describe('toggling scoped to the active tab', () => {
		it('toggles only the targeted mock-response item, leaving the rest of that tab and the http-rules tab untouched', async () => {
			render(<Popup />);
			const target = fixtureMockResponses[0];
			const others = fixtureMockResponses.filter((item) => item.id !== target.id);

			expectRowSwitchChecked(target.name, target.enabled);
			await userEvent.click(rowSwitch(target.name));
			expectRowSwitchChecked(target.name, !target.enabled);

			for (const item of others) {
				expectRowSwitchChecked(item.name, item.enabled);
			}

			await userEvent.click(httpRulesTab());
			for (const item of fixtureHttpRules) {
				expectRowSwitchChecked(item.name, item.enabled);
			}
		});

		it('toggles only the targeted http-rule item, leaving the rest of that tab and the mock-responses tab untouched', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());

			const target = fixtureHttpRules[0];
			const others = fixtureHttpRules.filter((item) => item.id !== target.id);

			expectRowSwitchChecked(target.name, target.enabled);
			await userEvent.click(rowSwitch(target.name));
			expectRowSwitchChecked(target.name, !target.enabled);

			for (const item of others) {
				expectRowSwitchChecked(item.name, item.enabled);
			}

			await userEvent.click(mockResponsesTab());
			for (const item of fixtureMockResponses) {
				expectRowSwitchChecked(item.name, item.enabled);
			}
		});
	});

	describe('deleting scoped to the active tab', () => {
		it('deletes only the targeted mock-response item, leaving the http-rules tab untouched', async () => {
			render(<Popup />);
			const target = fixtureMockResponses[0];
			const remaining = fixtureMockResponses.filter((item) => item.id !== target.id);

			await userEvent.click(deleteButton(target.name));

			expect(screen.queryByText(target.name)).not.toBeInTheDocument();
			for (const item of remaining) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}

			await userEvent.click(httpRulesTab());
			for (const item of fixtureHttpRules) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});

		it('deletes only the targeted http-rule item, leaving the mock-responses tab untouched', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());

			const target = fixtureHttpRules[0];
			const remaining = fixtureHttpRules.filter((item) => item.id !== target.id);

			await userEvent.click(deleteButton(target.name));

			expect(screen.queryByText(target.name)).not.toBeInTheDocument();
			for (const item of remaining) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}

			await userEvent.click(mockResponsesTab());
			for (const item of fixtureMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});
	});

	describe('master switch off/on', () => {
		it('dims the card once the master switch is off', async () => {
			render(<Popup />);

			// The card is a plain MUI Paper with no accessible role/label of its
			// own, so there's nothing more semantic to query it by; this is
			// specifically testing a visual style property.
			const card = document.querySelector('.MuiPaper-root');
			if (!card) {
				throw new Error('Expected to find the card Paper element');
			}

			const runningBackgroundColor = getComputedStyle(card).backgroundColor;
			const runningBorderColor = getComputedStyle(card).borderColor;

			await userEvent.click(masterSwitch());

			expect(getComputedStyle(card).backgroundColor).not.toBe(runningBackgroundColor);
			expect(getComputedStyle(card).borderColor).not.toBe(runningBorderColor);
		});

		it('disables row switches while off and re-enables them once switched back on', async () => {
			render(<Popup />);
			const target = fixtureMockResponses[0];
			expect(rowSwitch(target.name)).not.toBeDisabled();

			await userEvent.click(masterSwitch());
			expect(rowSwitch(target.name)).toBeDisabled();

			await userEvent.click(masterSwitch());
			expect(rowSwitch(target.name)).not.toBeDisabled();
		});

		it('preserves per-item toggled state across an off -> on cycle', async () => {
			render(<Popup />);
			const target = fixtureMockResponses[0];
			const toggledState = !target.enabled;

			await userEvent.click(rowSwitch(target.name));
			expectRowSwitchChecked(target.name, toggledState);

			const master = masterSwitch();
			await userEvent.click(master);
			expect(master).not.toBeChecked();
			await userEvent.click(master);
			expect(master).toBeChecked();

			expectRowSwitchChecked(target.name, toggledState);
		});
	});

	describe('export', () => {
		it('clicking Export downloads all mock responses and http rules as one JSON payload', async () => {
			render(<Popup />);

			await userEvent.click(screen.getByRole('button', { name: 'Export' }));

			expect(downloadJson).toHaveBeenCalledTimes(1);
			const [filename, payload] = (downloadJson as jest.Mock).mock.calls[0];
			expect(filename).toMatch(/^devtools-plus-items-\d{4}-\d{2}-\d{2}\.json$/);
			expect(JSON.parse(payload as string)).toEqual([
				...fixtureMockResponses,
				...fixtureHttpRules,
			]);
		});
	});

	describe('import', () => {
		const validMockPayload = JSON.stringify([
			{
				id: 'new-mock-1',
				name: 'New Mock',
				kind: 'mock-response',
				enabled: true,
				method: 'GET',
				urlPattern: '/new',
				statusCode: 200,
			},
		]);

		it('opens the import dialog when the Import button is clicked', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('button', { name: 'Import' }));
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('pastes valid JSON, imports it, updates the list, and shows a success alert', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('button', { name: 'Import' }));
			const dialog = screen.getByRole('dialog');

			fireEvent.change(within(dialog).getByPlaceholderText('[ ... ]'), {
				target: { value: validMockPayload },
			});
			await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

			expect(
				await screen.findByText('Imported 1 mock responses, 0 HTTP rules'),
			).toBeInTheDocument();
			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			expect(screen.getByText('New Mock')).toBeInTheDocument();
			for (const item of fixtureMockResponses) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}

			// httpRules were absent from the imported file, so that list is untouched.
			await userEvent.click(httpRulesTab());
			for (const item of fixtureHttpRules) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});

		it('pastes invalid JSON and shows an error alert, keeping the dialog open and the list unchanged', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('button', { name: 'Import' }));
			const dialog = screen.getByRole('dialog');

			fireEvent.change(within(dialog).getByPlaceholderText('[ ... ]'), {
				target: { value: 'not valid json' },
			});
			await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

			// The Alert renders with role="alert", but while the import Dialog's
			// modal is open, MUI marks the rest of the popup's subtree (including
			// this Snackbar/Alert, which isn't nested inside the dialog) as
			// aria-hidden — so it's found by text rather than by role here.
			expect(await screen.findByText(/Invalid JSON/)).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			for (const item of fixtureMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});

		it('imports a file selected via the file picker and updates the list', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('button', { name: 'Import' }));

			const file = new File([validMockPayload], 'items.json', { type: 'application/json' });
			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			fireEvent.change(fileInput, { target: { files: [file] } });

			expect(
				await screen.findByText('Imported 1 mock responses, 0 HTTP rules'),
			).toBeInTheDocument();
			expect(screen.getByText('New Mock')).toBeInTheDocument();
		});

		it('shows an error alert and keeps the dialog open if reading the selected file fails', async () => {
			(readFileAsText as jest.Mock).mockRejectedValueOnce(new Error('Failed to read file'));

			render(<Popup />);
			await userEvent.click(screen.getByRole('button', { name: 'Import' }));

			const file = new File([validMockPayload], 'items.json', { type: 'application/json' });
			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			fireEvent.change(fileInput, { target: { files: [file] } });

			expect(await screen.findByText('Failed to read file')).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();

			for (const item of fixtureMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});

		it('closing the dialog via Cancel clears the pasted text and leaves the list unchanged', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('button', { name: 'Import' }));
			const dialog = screen.getByRole('dialog');

			fireEvent.change(within(dialog).getByPlaceholderText('[ ... ]'), {
				target: { value: 'some text' },
			});
			await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});

			await userEvent.click(screen.getByRole('button', { name: 'Import' }));
			expect(screen.getByPlaceholderText('[ ... ]')).toHaveValue('');

			for (const item of fixtureMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});
	});
});
