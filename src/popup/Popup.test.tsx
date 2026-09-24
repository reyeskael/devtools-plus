import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popup } from './Popup';
import { seedHttpRules, seedMockResponses } from '../shared/items/seedItems';

jest.mock('../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp } from '../shared/chrome/openApp';

const STORAGE_KEY = 'popupItemsState';

const rowSwitch = (name: string) =>
	screen.getByRole('switch', { name: new RegExp(`^${name} switch$`, 'i') });

const deleteButton = (name: string) =>
	screen.getByRole('button', { name: new RegExp(`^Delete ${name}$`, 'i') });

const addButton = () => screen.getByRole('button', { name: /^add$/i });

const mockResponsesTab = () => screen.getByRole('tab', { name: /api response mock/i });

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
		// mock call history) before every test to keep them independent.
		chrome.storage.local.set({ [STORAGE_KEY]: undefined });
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
			expect(tabs[0]).toHaveTextContent('API Response Mock');
			expect(tabs[1]).toHaveTextContent('HTTP Rules');
		});

		it('selects the API Response Mock tab by default', () => {
			render(<Popup />);
			expect(mockResponsesTab()).toHaveAttribute('aria-selected', 'true');
			expect(httpRulesTab()).toHaveAttribute('aria-selected', 'false');
		});
	});

	describe('cross-tab scoping', () => {
		it('shows the seeded mock responses only on the mock-responses tab', async () => {
			render(<Popup />);

			for (const item of seedMockResponses) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
			for (const item of seedHttpRules) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}

			await userEvent.click(httpRulesTab());

			for (const item of seedMockResponses) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}
		});

		it('shows the seeded HTTP rules only on the http-rules tab', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());

			for (const item of seedHttpRules) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
			for (const item of seedMockResponses) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}

			await userEvent.click(mockResponsesTab());

			for (const item of seedHttpRules) {
				expect(screen.queryByText(item.name)).not.toBeInTheDocument();
			}
			for (const item of seedMockResponses) {
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
			for (const item of seedMockResponses) {
				await userEvent.click(deleteButton(item.name));
			}

			await userEvent.click(screen.getByRole('button', { name: /add mock response/i }));

			expect(openApp).toHaveBeenCalledWith('mock-api');
		});

		it('calls openApp with "http-rules" from the empty-state action once every HTTP rule is deleted', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());
			for (const item of seedHttpRules) {
				await userEvent.click(deleteButton(item.name));
			}

			await userEvent.click(screen.getByRole('button', { name: /add http rule/i }));

			expect(openApp).toHaveBeenCalledWith('http-rules');
		});
	});

	describe('empty states', () => {
		it('shows the mock-responses empty-state copy once every mock response is deleted', async () => {
			render(<Popup />);
			for (const item of seedMockResponses) {
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
			for (const item of seedHttpRules) {
				await userEvent.click(deleteButton(item.name));
			}

			expect(screen.getByText('No HTTP rules yet')).toBeInTheDocument();
			expect(
				screen.getByText('Add an HTTP rule in the full app to get started.'),
			).toBeInTheDocument();
		});

		it('uses distinct empty-state copy for each tab', async () => {
			render(<Popup />);
			for (const item of seedMockResponses) {
				await userEvent.click(deleteButton(item.name));
			}
			const mockResponsesHeadline = screen.getByText('No mock responses yet').textContent;
			const mockResponsesBody = screen.getByText(
				'Add a mock response in the full app to get started.',
			).textContent;

			await userEvent.click(httpRulesTab());
			for (const item of seedHttpRules) {
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
			const target = seedMockResponses[0];
			const others = seedMockResponses.filter((item) => item.id !== target.id);

			expectRowSwitchChecked(target.name, target.enabled);
			await userEvent.click(rowSwitch(target.name));
			expectRowSwitchChecked(target.name, !target.enabled);

			for (const item of others) {
				expectRowSwitchChecked(item.name, item.enabled);
			}

			await userEvent.click(httpRulesTab());
			for (const item of seedHttpRules) {
				expectRowSwitchChecked(item.name, item.enabled);
			}
		});

		it('toggles only the targeted http-rule item, leaving the rest of that tab and the mock-responses tab untouched', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());

			const target = seedHttpRules[0];
			const others = seedHttpRules.filter((item) => item.id !== target.id);

			expectRowSwitchChecked(target.name, target.enabled);
			await userEvent.click(rowSwitch(target.name));
			expectRowSwitchChecked(target.name, !target.enabled);

			for (const item of others) {
				expectRowSwitchChecked(item.name, item.enabled);
			}

			await userEvent.click(mockResponsesTab());
			for (const item of seedMockResponses) {
				expectRowSwitchChecked(item.name, item.enabled);
			}
		});
	});

	describe('deleting scoped to the active tab', () => {
		it('deletes only the targeted mock-response item, leaving the http-rules tab untouched', async () => {
			render(<Popup />);
			const target = seedMockResponses[0];
			const remaining = seedMockResponses.filter((item) => item.id !== target.id);

			await userEvent.click(deleteButton(target.name));

			expect(screen.queryByText(target.name)).not.toBeInTheDocument();
			for (const item of remaining) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}

			await userEvent.click(httpRulesTab());
			for (const item of seedHttpRules) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}
		});

		it('deletes only the targeted http-rule item, leaving the mock-responses tab untouched', async () => {
			render(<Popup />);
			await userEvent.click(httpRulesTab());

			const target = seedHttpRules[0];
			const remaining = seedHttpRules.filter((item) => item.id !== target.id);

			await userEvent.click(deleteButton(target.name));

			expect(screen.queryByText(target.name)).not.toBeInTheDocument();
			for (const item of remaining) {
				expect(screen.getByText(item.name)).toBeInTheDocument();
			}

			await userEvent.click(mockResponsesTab());
			for (const item of seedMockResponses) {
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
			const target = seedMockResponses[0];
			expect(rowSwitch(target.name)).not.toBeDisabled();

			await userEvent.click(masterSwitch());
			expect(rowSwitch(target.name)).toBeDisabled();

			await userEvent.click(masterSwitch());
			expect(rowSwitch(target.name)).not.toBeDisabled();
		});

		it('preserves per-item toggled state across an off -> on cycle', async () => {
			render(<Popup />);
			const target = seedMockResponses[0];
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
});
