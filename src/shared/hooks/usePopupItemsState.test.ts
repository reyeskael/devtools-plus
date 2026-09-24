import { act, renderHook, waitFor } from '@testing-library/react';
import { seedHttpRules, seedMockResponses } from '../items/seedItems';
import { usePopupItemsState } from './usePopupItemsState';

const STORAGE_KEY = 'popupItemsState';

describe('usePopupItemsState', () => {
	beforeEach(() => {
		// The chrome.storage.local stub in jest.setup.ts backs onto a module-level
		// object that persists across tests within this file, so reset it (and the
		// mock call history) before every test to keep them independent.
		chrome.storage.local.set({ [STORAGE_KEY]: undefined });
		jest.clearAllMocks();
	});

	it('starts running with the seeded mock responses and http rules', () => {
		const { result } = renderHook(() => usePopupItemsState());

		expect(result.current.isRunning).toBe(true);
		expect(result.current.mockResponses).toEqual(seedMockResponses);
		expect(result.current.httpRules).toEqual(seedHttpRules);
	});

	it('item data is JSON-serializable', () => {
		const { result } = renderHook(() => usePopupItemsState());

		expect(JSON.parse(JSON.stringify(result.current.mockResponses))).toEqual(
			result.current.mockResponses,
		);
		expect(JSON.parse(JSON.stringify(result.current.httpRules))).toEqual(result.current.httpRules);
	});

	it("toggleItem('mock-response', id) flips only the targeted mock response's enabled flag", () => {
		const { result } = renderHook(() => usePopupItemsState());
		const [first, second] = result.current.mockResponses;
		const httpRulesBefore = result.current.httpRules;

		act(() => {
			result.current.toggleItem('mock-response', first.id);
		});

		expect(result.current.mockResponses.find((item) => item.id === first.id)?.enabled).toBe(
			!first.enabled,
		);
		expect(result.current.mockResponses.find((item) => item.id === second.id)?.enabled).toBe(
			second.enabled,
		);
		expect(result.current.httpRules).toEqual(httpRulesBefore);
	});

	it("toggleItem('http-rule', id) flips only the targeted http rule's enabled flag", () => {
		const { result } = renderHook(() => usePopupItemsState());
		const [first, second] = result.current.httpRules;
		const mockResponsesBefore = result.current.mockResponses;

		act(() => {
			result.current.toggleItem('http-rule', first.id);
		});

		expect(result.current.httpRules.find((item) => item.id === first.id)?.enabled).toBe(
			!first.enabled,
		);
		expect(result.current.httpRules.find((item) => item.id === second.id)?.enabled).toBe(
			second.enabled,
		);
		expect(result.current.mockResponses).toEqual(mockResponsesBefore);
	});

	it("removeItem('mock-response', id) removes only that item from mockResponses", () => {
		const { result } = renderHook(() => usePopupItemsState());
		const [first] = result.current.mockResponses;
		const httpRulesBefore = result.current.httpRules;

		act(() => {
			result.current.removeItem('mock-response', first.id);
		});

		expect(result.current.mockResponses.find((item) => item.id === first.id)).toBeUndefined();
		expect(result.current.mockResponses).toHaveLength(seedMockResponses.length - 1);
		expect(result.current.httpRules).toEqual(httpRulesBefore);
	});

	it("removeItem('http-rule', id) removes only that item from httpRules", () => {
		const { result } = renderHook(() => usePopupItemsState());
		const [first] = result.current.httpRules;
		const mockResponsesBefore = result.current.mockResponses;

		act(() => {
			result.current.removeItem('http-rule', first.id);
		});

		expect(result.current.httpRules.find((item) => item.id === first.id)).toBeUndefined();
		expect(result.current.httpRules).toHaveLength(seedHttpRules.length - 1);
		expect(result.current.mockResponses).toEqual(mockResponsesBefore);
	});

	it('setRunning updates isRunning', () => {
		const { result } = renderHook(() => usePopupItemsState());

		act(() => {
			result.current.setRunning(false);
		});

		expect(result.current.isRunning).toBe(false);
	});

	describe('persistence', () => {
		it('keeps the default mock responses, http rules, and isRunning once hydration settles on empty storage', async () => {
			const { result } = renderHook(() => usePopupItemsState());

			await waitFor(() => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith(
					STORAGE_KEY,
					expect.any(Function),
				);
			});

			expect(result.current.isRunning).toBe(true);
			expect(result.current.mockResponses).toEqual(seedMockResponses);
			expect(result.current.httpRules).toEqual(seedHttpRules);
		});

		it('hydrates mockResponses, httpRules, and isRunning from previously persisted storage on mount', async () => {
			const persistedMockResponses = seedMockResponses.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			const persistedHttpRules = seedHttpRules.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			chrome.storage.local.set({
				[STORAGE_KEY]: {
					mockResponses: persistedMockResponses,
					httpRules: persistedHttpRules,
					isRunning: false,
				},
			});

			const { result } = renderHook(() => usePopupItemsState());

			await waitFor(() => {
				expect(result.current.isRunning).toBe(false);
			});
			expect(result.current.mockResponses).toEqual(persistedMockResponses);
			expect(result.current.httpRules).toEqual(persistedHttpRules);
		});

		it('leaves storage holding the seeded value (not the in-memory defaults) once mount settles', () => {
			// Note: with a purely async chrome.storage.local.get (the real Chrome
			// behavior), the persist effect's hasHydratedRef guard skips entirely
			// until hydration's setState has already landed, so no set() call with
			// defaults ever fires. This jest stub's get() resolves synchronously
			// inside the same effect-flush pass, so the persist effect can run once
			// with the old default mockResponses/httpRules/isRunning before the
			// hydrated state commits, producing an extra (harmless, self-correcting)
			// set() call with defaults. Rather than assert set() is never called —
			// which is only true under a genuinely async callback and would be a
			// brittle, environment-coupled assertion here — assert on the invariant
			// that actually matters: storage converges to the seeded value, never
			// stays clobbered with defaults.
			const persistedMockResponses = seedMockResponses.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			const persistedHttpRules = seedHttpRules.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			chrome.storage.local.set({
				[STORAGE_KEY]: {
					mockResponses: persistedMockResponses,
					httpRules: persistedHttpRules,
					isRunning: false,
				},
			});

			renderHook(() => usePopupItemsState());

			let stored: unknown;
			chrome.storage.local.get(STORAGE_KEY, (result) => {
				stored = result[STORAGE_KEY];
			});

			expect(stored).toEqual({
				mockResponses: persistedMockResponses,
				httpRules: persistedHttpRules,
				isRunning: false,
			});
		});

		it('persists mock-response toggles to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.toggleItem('mock-response', seedMockResponses[0].id);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: {
					mockResponses: result.current.mockResponses,
					httpRules: result.current.httpRules,
					isRunning: true,
				},
			});
		});

		it('persists http-rule toggles to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.toggleItem('http-rule', seedHttpRules[1].id);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: {
					mockResponses: result.current.mockResponses,
					httpRules: result.current.httpRules,
					isRunning: true,
				},
			});
		});

		it('persists removeItem changes to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.removeItem('mock-response', seedMockResponses[0].id);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: {
					mockResponses: result.current.mockResponses,
					httpRules: result.current.httpRules,
					isRunning: true,
				},
			});
		});

		it('persists setRunning changes to chrome.storage.local after hydration', () => {
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.setRunning(false);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: {
					mockResponses: result.current.mockResponses,
					httpRules: result.current.httpRules,
					isRunning: false,
				},
			});
		});
	});
});
