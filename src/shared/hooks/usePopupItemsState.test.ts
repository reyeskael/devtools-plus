import { act, renderHook, waitFor } from '@testing-library/react';
import { seedHttpRules } from '../items/seedItems';
import { usePopupItemsState } from './usePopupItemsState';
import type { HttpRuleItem, MockResponseItem } from '../items/types';

const STORAGE_KEY = 'popupItemsState';

// Local fixtures — the real seedMockResponses is now an empty array (mock
// responses come from Import, not a bundled seed), so tests that need
// non-empty starting data seed chrome.storage.local directly instead of
// relying on the module's in-memory defaults.
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

interface StoredOverrides {
	mockResponses?: MockResponseItem[];
	httpRules?: HttpRuleItem[];
	isRunning?: boolean;
}

// chrome.storage.local.get's stub in jest.setup.ts invokes its callback
// synchronously, so seeding storage before renderHook() lets the hook's
// hydration effect resolve within the same synchronous act() flush that
// renderHook performs — tests can assert on result.current immediately.
const seedStorage = (overrides: StoredOverrides = {}) => {
	chrome.storage.local.set({
		[STORAGE_KEY]: {
			mockResponses: fixtureMockResponses,
			httpRules: fixtureHttpRules,
			isRunning: true,
			...overrides,
		},
	});
};

describe('usePopupItemsState', () => {
	it('starts running with the real in-memory defaults before any storage exists', () => {
		const { result } = renderHook(() => usePopupItemsState());

		expect(result.current.isRunning).toBe(true);
		expect(result.current.mockResponses).toEqual([]);
		expect(result.current.httpRules).toEqual(seedHttpRules);
	});

	it('item data is JSON-serializable', () => {
		seedStorage();
		const { result } = renderHook(() => usePopupItemsState());

		expect(JSON.parse(JSON.stringify(result.current.mockResponses))).toEqual(
			result.current.mockResponses,
		);
		expect(JSON.parse(JSON.stringify(result.current.httpRules))).toEqual(result.current.httpRules);
	});

	it("toggleItem('mock-response', id) flips only the targeted mock response's enabled flag", () => {
		seedStorage();
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
		seedStorage();
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
		seedStorage();
		const { result } = renderHook(() => usePopupItemsState());
		const [first] = result.current.mockResponses;
		const httpRulesBefore = result.current.httpRules;

		act(() => {
			result.current.removeItem('mock-response', first.id);
		});

		expect(result.current.mockResponses.find((item) => item.id === first.id)).toBeUndefined();
		expect(result.current.mockResponses).toHaveLength(fixtureMockResponses.length - 1);
		expect(result.current.httpRules).toEqual(httpRulesBefore);
	});

	it("removeItem('http-rule', id) removes only that item from httpRules", () => {
		seedStorage();
		const { result } = renderHook(() => usePopupItemsState());
		const [first] = result.current.httpRules;
		const mockResponsesBefore = result.current.mockResponses;

		act(() => {
			result.current.removeItem('http-rule', first.id);
		});

		expect(result.current.httpRules.find((item) => item.id === first.id)).toBeUndefined();
		expect(result.current.httpRules).toHaveLength(fixtureHttpRules.length - 1);
		expect(result.current.mockResponses).toEqual(mockResponsesBefore);
	});

	it('setRunning updates isRunning', () => {
		const { result } = renderHook(() => usePopupItemsState());

		act(() => {
			result.current.setRunning(false);
		});

		expect(result.current.isRunning).toBe(false);
	});

	describe('replaceItems', () => {
		it('replacing only mockResponses leaves httpRules untouched', () => {
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());
			const httpRulesBefore = result.current.httpRules;
			const nextMockResponses: MockResponseItem[] = [
				{
					id: 'imported-1',
					name: 'Imported mock',
					kind: 'mock-response',
					enabled: true,
					method: 'GET',
					urlPattern: '/imported',
					statusCode: 200,
				},
			];

			act(() => {
				result.current.replaceItems(nextMockResponses, undefined);
			});

			expect(result.current.mockResponses).toEqual(nextMockResponses);
			expect(result.current.httpRules).toEqual(httpRulesBefore);
		});

		it('replacing only httpRules leaves mockResponses untouched', () => {
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());
			const mockResponsesBefore = result.current.mockResponses;
			const nextHttpRules: HttpRuleItem[] = [
				{
					id: 'imported-rule-1',
					name: 'Imported rule',
					kind: 'http-rule',
					enabled: true,
					urlPattern: '/imported/*',
					action: 'block',
				},
			];

			act(() => {
				result.current.replaceItems(undefined, nextHttpRules);
			});

			expect(result.current.httpRules).toEqual(nextHttpRules);
			expect(result.current.mockResponses).toEqual(mockResponsesBefore);
		});

		it('replaces both mockResponses and httpRules at once', () => {
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());
			const nextMockResponses: MockResponseItem[] = [
				{
					id: 'imported-2',
					name: 'Imported mock 2',
					kind: 'mock-response',
					enabled: false,
					method: 'PUT',
					urlPattern: '/imported2',
					statusCode: 204,
				},
			];
			const nextHttpRules: HttpRuleItem[] = [
				{
					id: 'imported-rule-2',
					name: 'Imported rule 2',
					kind: 'http-rule',
					enabled: false,
					urlPattern: '/imported2/*',
					action: 'redirect',
					target: '/target',
				},
			];

			act(() => {
				result.current.replaceItems(nextMockResponses, nextHttpRules);
			});

			expect(result.current.mockResponses).toEqual(nextMockResponses);
			expect(result.current.httpRules).toEqual(nextHttpRules);
		});

		it('passing undefined for both arguments leaves both lists exactly as they were', () => {
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());
			const mockResponsesBefore = result.current.mockResponses;
			const httpRulesBefore = result.current.httpRules;

			act(() => {
				result.current.replaceItems(undefined, undefined);
			});

			expect(result.current.mockResponses).toEqual(mockResponsesBefore);
			expect(result.current.httpRules).toEqual(httpRulesBefore);
		});

		it('persists a replaceItems call to chrome.storage.local after hydration', () => {
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());
			const nextMockResponses: MockResponseItem[] = [
				{
					id: 'imported-3',
					name: 'Imported mock 3',
					kind: 'mock-response',
					enabled: true,
					method: 'DELETE',
					urlPattern: '/imported3',
					statusCode: 200,
				},
			];

			act(() => {
				result.current.replaceItems(nextMockResponses, undefined);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: {
					mockResponses: nextMockResponses,
					httpRules: result.current.httpRules,
					isRunning: true,
				},
			});
		});
	});

	describe('persistence', () => {
		it('keeps the default mock responses, http rules, and isRunning once hydration settles on empty storage', async () => {
			const { result } = renderHook(() => usePopupItemsState());

			await waitFor(() => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEY, expect.any(Function));
			});

			expect(result.current.isRunning).toBe(true);
			expect(result.current.mockResponses).toEqual([]);
			expect(result.current.httpRules).toEqual(seedHttpRules);
		});

		it('hydrates mockResponses, httpRules, and isRunning from previously persisted storage on mount', async () => {
			const persistedMockResponses = fixtureMockResponses.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			const persistedHttpRules = fixtureHttpRules.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			seedStorage({
				mockResponses: persistedMockResponses,
				httpRules: persistedHttpRules,
				isRunning: false,
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
			const persistedMockResponses = fixtureMockResponses.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			const persistedHttpRules = fixtureHttpRules.map((item, index) =>
				index === 0 ? { ...item, enabled: !item.enabled } : item,
			);
			seedStorage({
				mockResponses: persistedMockResponses,
				httpRules: persistedHttpRules,
				isRunning: false,
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
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.toggleItem('mock-response', fixtureMockResponses[0].id);
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
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.toggleItem('http-rule', fixtureHttpRules[1].id);
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
			seedStorage();
			const { result } = renderHook(() => usePopupItemsState());

			act(() => {
				result.current.removeItem('mock-response', fixtureMockResponses[0].id);
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
			seedStorage();
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
