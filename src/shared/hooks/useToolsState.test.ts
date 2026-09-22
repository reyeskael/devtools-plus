import { act, renderHook, waitFor } from '@testing-library/react';
import { mockTools } from '../tools/mockTools';
import { useToolsState } from './useToolsState';

const STORAGE_KEY = 'toolsState';

describe('useToolsState', () => {
	beforeEach(() => {
		// The chrome.storage.local stub in jest.setup.ts backs onto a module-level
		// object that persists across tests within this file, so reset it (and the
		// mock call history) before every test to keep them independent.
		chrome.storage.local.set({ [STORAGE_KEY]: undefined });
		jest.clearAllMocks();
	});

	it('starts running with the mock tool catalogue', () => {
		const { result } = renderHook(() => useToolsState());

		expect(result.current.isRunning).toBe(true);
		expect(result.current.tools).toEqual(mockTools);
	});

	it('tool data is JSON-serializable', () => {
		const { result } = renderHook(() => useToolsState());

		expect(JSON.parse(JSON.stringify(result.current.tools))).toEqual(result.current.tools);
	});

	it("toggleTool flips only the targeted tool's enabled flag", () => {
		const { result } = renderHook(() => useToolsState());
		const [first, second] = result.current.tools;

		act(() => {
			result.current.toggleTool(first.id);
		});

		expect(result.current.tools.find((tool) => tool.id === first.id)?.enabled).toBe(
			!first.enabled,
		);
		expect(result.current.tools.find((tool) => tool.id === second.id)?.enabled).toBe(
			second.enabled,
		);
	});

	it("togglePin flips only the targeted tool's pinned flag", () => {
		const { result } = renderHook(() => useToolsState());
		const [first, second] = result.current.tools;

		act(() => {
			result.current.togglePin(first.id);
		});

		expect(result.current.tools.find((tool) => tool.id === first.id)?.pinned).toBe(
			!first.pinned,
		);
		expect(result.current.tools.find((tool) => tool.id === second.id)?.pinned).toBe(
			second.pinned,
		);
	});

	it('setRunning updates isRunning', () => {
		const { result } = renderHook(() => useToolsState());

		act(() => {
			result.current.setRunning(false);
		});

		expect(result.current.isRunning).toBe(false);
	});

	it('preserves per-tool enabled/pinned state across a master off -> on cycle', () => {
		const { result } = renderHook(() => useToolsState());
		const [first] = result.current.tools;

		act(() => {
			result.current.toggleTool(first.id);
			result.current.togglePin(first.id);
		});
		const toggled = result.current.tools.find((tool) => tool.id === first.id);

		act(() => {
			result.current.setRunning(false);
		});
		act(() => {
			result.current.setRunning(true);
		});

		expect(result.current.tools.find((tool) => tool.id === first.id)).toEqual(toggled);
	});

	describe('persistence', () => {
		it('keeps the default tools and isRunning once hydration settles on empty storage', async () => {
			const { result } = renderHook(() => useToolsState());

			await waitFor(() => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith(
					STORAGE_KEY,
					expect.any(Function),
				);
			});

			expect(result.current.isRunning).toBe(true);
			expect(result.current.tools).toEqual(mockTools);
		});

		it('hydrates tools and isRunning from previously persisted storage on mount', async () => {
			const persistedTools = mockTools.map((tool, index) =>
				index === 0 ? { ...tool, enabled: !tool.enabled, pinned: !tool.pinned } : tool,
			);
			chrome.storage.local.set({
				[STORAGE_KEY]: { tools: persistedTools, isRunning: false },
			});

			const { result } = renderHook(() => useToolsState());

			await waitFor(() => {
				expect(result.current.isRunning).toBe(false);
			});
			expect(result.current.tools).toEqual(persistedTools);
		});

		it('leaves storage holding the seeded value (not the in-memory defaults) once mount settles', () => {
			// Note: with a purely async chrome.storage.local.get (the real Chrome
			// behavior), the persist effect's hasHydratedRef guard skips entirely
			// until hydration's setState has already landed, so no set() call with
			// defaults ever fires. This jest stub's get() resolves synchronously
			// inside the same effect-flush pass, so the persist effect can run once
			// with the old default tools/isRunning before the hydrated state commits,
			// producing an extra (harmless, self-correcting) set() call with
			// defaults. Rather than assert set() is never called — which is only
			// true under a genuinely async callback and would be a brittle,
			// environment-coupled assertion here — assert on the invariant that
			// actually matters: storage converges to the seeded value, never stays
			// clobbered with defaults.
			const persistedTools = mockTools.map((tool, index) =>
				index === 0 ? { ...tool, enabled: !tool.enabled } : tool,
			);
			chrome.storage.local.set({
				[STORAGE_KEY]: { tools: persistedTools, isRunning: false },
			});

			renderHook(() => useToolsState());

			let stored: unknown;
			chrome.storage.local.get(STORAGE_KEY, (result) => {
				stored = result[STORAGE_KEY];
			});

			expect(stored).toEqual({ tools: persistedTools, isRunning: false });
		});

		it('persists tool toggles to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => useToolsState());

			act(() => {
				result.current.toggleTool(mockTools[0].id);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: { tools: result.current.tools, isRunning: true },
			});
		});

		it('persists pin toggles to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => useToolsState());

			act(() => {
				result.current.togglePin(mockTools[1].id);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: { tools: result.current.tools, isRunning: true },
			});
		});

		it('persists setRunning changes to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => useToolsState());

			act(() => {
				result.current.setRunning(false);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: { tools: result.current.tools, isRunning: false },
			});
		});
	});
});
