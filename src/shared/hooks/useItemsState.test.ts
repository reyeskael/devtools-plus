import { act, renderHook, waitFor } from '@testing-library/react';
import { seedHttpRules } from '../items/seedItems';
import { useItemsState } from './useItemsState';
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

describe('useItemsState', () => {
	it('starts running with the real in-memory defaults before any storage exists', () => {
		const { result } = renderHook(() => useItemsState());

		expect(result.current.isRunning).toBe(true);
		expect(result.current.mockResponses).toEqual([]);
		expect(result.current.httpRules).toEqual(seedHttpRules);
	});

	it("hasHydrated starts false and flips true once the mount effect's chrome.storage.local.get callback fires", async () => {
		// jest.setup.ts's chrome.storage.local.get stub normally invokes its callback
		// synchronously, which would flip hasHydrated true within the same render/effect flush
		// renderHook performs and defeat this test's "starts false" assertion. Deferring the
		// callback by a macrotask here observes the real, momentarily-false state.
		const originalGet = (chrome.storage.local.get as jest.Mock).getMockImplementation();
		(chrome.storage.local.get as jest.Mock).mockImplementationOnce(
			(key: string, callback: (result: Record<string, unknown>) => void) => {
				setTimeout(() => originalGet?.(key, callback), 0);
			},
		);

		const { result } = renderHook(() => useItemsState());

		expect(result.current.hasHydrated).toBe(false);

		await waitFor(() => {
			expect(result.current.hasHydrated).toBe(true);
		});
	});

	it('item data is JSON-serializable', () => {
		seedStorage();
		const { result } = renderHook(() => useItemsState());

		expect(JSON.parse(JSON.stringify(result.current.mockResponses))).toEqual(
			result.current.mockResponses,
		);
		expect(JSON.parse(JSON.stringify(result.current.httpRules))).toEqual(result.current.httpRules);
	});

	it("toggleItem('mock-response', id) flips only the targeted mock response's enabled flag", () => {
		seedStorage();
		const { result } = renderHook(() => useItemsState());
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
		const { result } = renderHook(() => useItemsState());
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
		const { result } = renderHook(() => useItemsState());
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
		const { result } = renderHook(() => useItemsState());
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
		const { result } = renderHook(() => useItemsState());

		act(() => {
			result.current.setRunning(false);
		});

		expect(result.current.isRunning).toBe(false);
	});

	describe('replaceItems', () => {
		it('replacing only mockResponses leaves httpRules untouched', () => {
			seedStorage();
			const { result } = renderHook(() => useItemsState());
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
			const { result } = renderHook(() => useItemsState());
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
			const { result } = renderHook(() => useItemsState());
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
			const { result } = renderHook(() => useItemsState());
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
			const { result } = renderHook(() => useItemsState());
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

	describe('upsertMockResponse', () => {
		it('appends a new item (id not present) to the end, leaving existing items and httpRules untouched', () => {
			seedStorage();
			const { result } = renderHook(() => useItemsState());
			const httpRulesBefore = result.current.httpRules;
			const newItem: MockResponseItem = {
				id: 'mr-3',
				name: 'Delete user',
				kind: 'mock-response',
				enabled: true,
				method: 'DELETE',
				urlPattern: '/api/users/1',
				statusCode: 204,
			};

			act(() => {
				result.current.upsertMockResponse(newItem);
			});

			expect(result.current.mockResponses).toHaveLength(fixtureMockResponses.length + 1);
			expect(result.current.mockResponses.slice(0, fixtureMockResponses.length)).toEqual(
				fixtureMockResponses,
			);
			expect(result.current.mockResponses[fixtureMockResponses.length]).toEqual(newItem);
			expect(result.current.httpRules).toEqual(httpRulesBefore);
		});

		it('replaces an existing item (matching id) in place, keeping the same length and position', () => {
			seedStorage();
			const { result } = renderHook(() => useItemsState());
			const updatedItem: MockResponseItem = {
				...fixtureMockResponses[0],
				name: 'Get users (updated)',
				statusCode: 999,
			};

			act(() => {
				result.current.upsertMockResponse(updatedItem);
			});

			expect(result.current.mockResponses).toHaveLength(fixtureMockResponses.length);
			expect(result.current.mockResponses[0]).toEqual(updatedItem);
			expect(result.current.mockResponses[1]).toEqual(fixtureMockResponses[1]);
		});

		it('persists an upsertMockResponse call to chrome.storage.local after hydration', () => {
			seedStorage();
			const { result } = renderHook(() => useItemsState());
			const newItem: MockResponseItem = {
				id: 'mr-3',
				name: 'Delete user',
				kind: 'mock-response',
				enabled: true,
				method: 'DELETE',
				urlPattern: '/api/users/1',
				statusCode: 204,
			};

			act(() => {
				result.current.upsertMockResponse(newItem);
			});

			expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
				[STORAGE_KEY]: {
					mockResponses: result.current.mockResponses,
					httpRules: result.current.httpRules,
					isRunning: true,
				},
			});
		});
	});

	describe('external chrome.storage.onChanged', () => {
		it('applies a genuinely external change (one this instance never wrote) to mockResponses, httpRules, and isRunning', () => {
			seedStorage();
			const { result } = renderHook(() => useItemsState());
			const listener = (chrome.storage.onChanged.addListener as jest.Mock).mock.calls[0][0];
			const externalMockResponses: MockResponseItem[] = [
				{
					id: 'external-1',
					name: 'External mock',
					kind: 'mock-response',
					enabled: true,
					method: 'GET',
					urlPattern: '/external',
					statusCode: 200,
				},
			];
			const externalHttpRules: HttpRuleItem[] = [
				{
					id: 'external-rule-1',
					name: 'External rule',
					kind: 'http-rule',
					enabled: true,
					urlPattern: '/external/*',
					action: 'block',
				},
			];

			act(() => {
				listener(
					{
						[STORAGE_KEY]: {
							newValue: {
								mockResponses: externalMockResponses,
								httpRules: externalHttpRules,
								isRunning: false,
							},
							oldValue: {
								mockResponses: fixtureMockResponses,
								httpRules: fixtureHttpRules,
								isRunning: true,
							},
						},
					},
					'local',
				);
			});

			expect(result.current.mockResponses).toEqual(externalMockResponses);
			expect(result.current.httpRules).toEqual(externalHttpRules);
			expect(result.current.isRunning).toBe(false);
		});

		it("does not re-persist to chrome.storage.local when the incoming change matches this instance's own last write (loop guard)", () => {
			seedStorage();
			const { result } = renderHook(() => useItemsState());
			const listener = (chrome.storage.onChanged.addListener as jest.Mock).mock.calls[0][0];
			const newItem: MockResponseItem = {
				id: 'mr-3',
				name: 'Delete user',
				kind: 'mock-response',
				enabled: true,
				method: 'DELETE',
				urlPattern: '/api/users/1',
				statusCode: 204,
			};

			act(() => {
				result.current.upsertMockResponse(newItem);
			});

			const setMock = chrome.storage.local.set as jest.Mock;
			const lastWrittenPayload = setMock.mock.calls[setMock.mock.calls.length - 1][0][STORAGE_KEY];
			const setCallCountBefore = setMock.mock.calls.length;

			act(() => {
				listener(
					{
						[STORAGE_KEY]: {
							newValue: lastWrittenPayload,
							oldValue: {
								mockResponses: fixtureMockResponses,
								httpRules: fixtureHttpRules,
								isRunning: true,
							},
						},
					},
					'local',
				);
			});

			expect(setMock.mock.calls.length).toBe(setCallCountBefore);
		});
	});

	describe('persistence', () => {
		it('keeps the default mock responses, http rules, and isRunning once hydration settles on empty storage', async () => {
			const { result } = renderHook(() => useItemsState());

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

			const { result } = renderHook(() => useItemsState());

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

			renderHook(() => useItemsState());

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
			const { result } = renderHook(() => useItemsState());

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
			const { result } = renderHook(() => useItemsState());

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
			const { result } = renderHook(() => useItemsState());

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
			const { result } = renderHook(() => useItemsState());

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
