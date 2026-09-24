import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popup } from './Popup';
import { mockTools } from '../shared/tools/mockTools';
import type { Tool } from '../shared/tools/types';

jest.mock('../shared/chrome/openApp', () => ({
	openApp: jest.fn(),
}));

import { openApp } from '../shared/chrome/openApp';

const STORAGE_KEY = 'toolsState';

const requireTool = (id: string): Tool => {
	const tool = mockTools.find((candidate) => candidate.id === id);
	if (!tool) {
		throw new Error(`Expected mockTools to include a tool with id "${id}"`);
	}
	return tool;
};

const rowSwitch = (name: string) =>
	screen.getByRole('switch', { name: new RegExp(`^${name} switch$`, 'i') });

const pinButton = (action: 'Pin' | 'Unpin', name: string) =>
	screen.getByRole('button', { name: new RegExp(`^${action} ${name}$`, 'i') });

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

	it('calls openApp when clicked', async () => {
		render(<Popup />);
		await userEvent.click(screen.getByRole('button', { name: /open app/i }));
		expect(openApp).toHaveBeenCalledTimes(1);
	});

	it('renders the manifest version as a caption', () => {
		render(<Popup />);
		expect(screen.getByText('v0.1.0')).toBeInTheDocument();
	});

	describe('default view', () => {
		it('selects the Pinned tab and lists only the seeded pinned tools', () => {
			render(<Popup />);

			expect(screen.getByRole('tab', { name: /pinned/i })).toHaveAttribute(
				'aria-selected',
				'true',
			);

			const pinnedTools = mockTools.filter((tool) => tool.pinned);
			const unpinnedTools = mockTools.filter((tool) => !tool.pinned);
			expect(pinnedTools.length).toBeGreaterThan(0);

			for (const tool of pinnedTools) {
				expect(screen.getByText(tool.name)).toBeInTheDocument();
			}
			for (const tool of unpinnedTools) {
				expect(screen.queryByText(tool.name)).not.toBeInTheDocument();
			}
		});
	});

	describe('cross-tab vanish', () => {
		it('removes a tool from the Active tab immediately when it is switched off', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('tab', { name: /active/i }));

			const enabledTools = mockTools.filter((tool) => tool.enabled);
			expect(enabledTools.length).toBeGreaterThan(0);
			for (const tool of enabledTools) {
				expect(screen.getByText(tool.name)).toBeInTheDocument();
			}

			const target = requireTool('network-inspector');
			expect(target.enabled).toBe(true);

			await userEvent.click(rowSwitch(target.name));

			expect(screen.queryByText(target.name)).not.toBeInTheDocument();
			// The still-enabled tools remain, confirming Active membership is
			// re-derived rather than the whole tab clearing out.
			const stillEnabled = enabledTools.filter((tool) => tool.id !== target.id);
			for (const tool of stillEnabled) {
				expect(screen.getByText(tool.name)).toBeInTheDocument();
			}
		});
	});

	describe('pinning', () => {
		it('adds a tool to the Pinned tab once it is pinned', async () => {
			render(<Popup />);
			const target = requireTool('console-logger');
			expect(target.pinned).toBe(false);

			await userEvent.click(screen.getByRole('tab', { name: /all tools/i }));
			await userEvent.click(pinButton('Pin', target.name));

			await userEvent.click(screen.getByRole('tab', { name: /pinned/i }));
			expect(screen.getByText(target.name)).toBeInTheDocument();
		});

		it('removes a tool from the Pinned tab once it is unpinned', async () => {
			render(<Popup />);
			const target = requireTool('network-inspector');
			expect(target.pinned).toBe(true);
			expect(screen.getByText(target.name)).toBeInTheDocument();

			await userEvent.click(pinButton('Unpin', target.name));

			expect(screen.queryByText(target.name)).not.toBeInTheDocument();
		});
	});

	describe('master switch off/on', () => {
		it('disables row switches while off', async () => {
			render(<Popup />);
			const target = requireTool('network-inspector');
			expect(rowSwitch(target.name)).not.toBeDisabled();

			await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));

			expect(rowSwitch(target.name)).toBeDisabled();
		});

		it('preserves per-tool pinned state across an off -> on cycle', async () => {
			render(<Popup />);
			const target = requireTool('console-logger');
			expect(target.pinned).toBe(false);

			await userEvent.click(screen.getByRole('tab', { name: /all tools/i }));
			await userEvent.click(pinButton('Pin', target.name));
			expect(pinButton('Unpin', target.name)).toBeInTheDocument();

			const masterSwitch = screen.getByRole('switch', { name: /master switch/i });
			await userEvent.click(masterSwitch);
			expect(masterSwitch).not.toBeChecked();
			await userEvent.click(masterSwitch);
			expect(masterSwitch).toBeChecked();

			await userEvent.click(screen.getByRole('tab', { name: /pinned/i }));
			expect(screen.getByText(target.name)).toBeInTheDocument();
		});

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

			await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));

			expect(getComputedStyle(card).backgroundColor).not.toBe(runningBackgroundColor);
			expect(getComputedStyle(card).borderColor).not.toBe(runningBorderColor);
		});
	});

	describe('empty states', () => {
		it('shows "nothing pinned" once every pinned tool is unpinned, and its action switches to All tools', async () => {
			render(<Popup />);
			const pinnedTools = mockTools.filter((tool) => tool.pinned);

			for (const tool of pinnedTools) {
				await userEvent.click(pinButton('Unpin', tool.name));
			}

			expect(screen.getByText('Nothing pinned yet')).toBeInTheDocument();
			expect(
				screen.getByText('Pin your favorite tools for quick access.'),
			).toBeInTheDocument();

			await userEvent.click(screen.getByRole('button', { name: /browse all tools/i }));

			expect(screen.getByRole('tab', { name: /all tools/i })).toHaveAttribute(
				'aria-selected',
				'true',
			);
			for (const tool of mockTools) {
				expect(screen.getByText(tool.name)).toBeInTheDocument();
			}
		});

		it('shows "no active tools" once every enabled tool is switched off on the Active tab, and its action switches to All tools', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('tab', { name: /active/i }));

			const enabledTools = mockTools.filter((tool) => tool.enabled);
			for (const tool of enabledTools) {
				await userEvent.click(rowSwitch(tool.name));
			}

			expect(screen.getByText('No active tools')).toBeInTheDocument();
			expect(
				screen.getByText('Turn on a tool to see it appear here.'),
			).toBeInTheDocument();

			await userEvent.click(screen.getByRole('button', { name: /view all tools/i }));

			expect(screen.getByRole('tab', { name: /all tools/i })).toHaveAttribute(
				'aria-selected',
				'true',
			);
		});

		it('shows "DevTools Plus is off" while the master switch is off, and its action turns it back on without merely switching tabs', async () => {
			render(<Popup />);
			await userEvent.click(screen.getByRole('tab', { name: /active/i }));
			await userEvent.click(screen.getByRole('switch', { name: /master switch/i }));

			expect(screen.getByText('DevTools Plus is off')).toBeInTheDocument();
			expect(
				screen.getByText('Turn the extension back on to use your tools.'),
			).toBeInTheDocument();

			await userEvent.click(screen.getByRole('button', { name: /^turn on$/i }));

			expect(screen.getByRole('switch', { name: /master switch/i })).toBeChecked();
			expect(screen.queryByText('DevTools Plus is off')).not.toBeInTheDocument();

			// Still on the Active tab (the action didn't just navigate away), and
			// it now shows the previously-enabled tools instead of the empty state.
			expect(screen.getByRole('tab', { name: /active/i })).toHaveAttribute(
				'aria-selected',
				'true',
			);
			const enabledTools = mockTools.filter((tool) => tool.enabled);
			for (const tool of enabledTools) {
				expect(screen.getByText(tool.name)).toBeInTheDocument();
				expect(rowSwitch(tool.name)).not.toBeDisabled();
			}
		});
	});
});
