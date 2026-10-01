import { shouldResync, syncRedirectRules } from './syncRedirectRules';
import { POPUP_ITEMS_STORAGE_KEY } from '../shared/storage/keys';
import type { MockResponseItem, RedirectRuleItem } from '../shared/items/types';

const makeRedirectItem = (overrides: Partial<RedirectRuleItem> = {}): RedirectRuleItem => ({
	id: 'redirect-1',
	name: 'Redirect One',
	kind: 'redirect',
	enabled: true,
	matchType: 'wildcard',
	urlPattern: '/api/users',
	destination: '/api/users-new',
	...overrides,
});

const makeMockItem = (overrides: Partial<MockResponseItem> = {}): MockResponseItem => ({
	id: 'mock-1',
	name: 'Mock One',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/a',
	statusCode: 200,
	statusText: 'OK',
	...overrides,
});

/**
 * `syncRedirectRules` is fire-and-forget but now chains several awaited steps (storage read,
 * `getDynamicRules`, `updateDynamicRules`) onto a module-level promise tail. A `setTimeout` flush
 * clears the microtask queue regardless of how many hops are in that chain, so tests can assert on
 * the result right after calling it.
 */
const flushAsync = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const makeExistingRule = (id: number): chrome.declarativeNetRequest.Rule => ({
	id,
	priority: 1,
	action: { type: 'block' },
	condition: {},
});

const seedStorage = (state: {
	mockResponses?: MockResponseItem[];
	redirects?: RedirectRuleItem[];
	isRunning?: boolean;
}): void => {
	(chrome.storage.local.get as jest.Mock).mockImplementationOnce(
		(_key: string, callback: (result: Record<string, unknown>) => void) => {
			callback({ [POPUP_ITEMS_STORAGE_KEY]: state });
		},
	);
};

describe('shouldResync', () => {
	it('is true when areaName is "local" and the storage key is present in changes', () => {
		expect(
			shouldResync({ [POPUP_ITEMS_STORAGE_KEY]: { newValue: {} } }, 'local'),
		).toBe(true);
	});

	it('is false when areaName is "sync", even if the key is present', () => {
		expect(
			shouldResync({ [POPUP_ITEMS_STORAGE_KEY]: { newValue: {} } }, 'sync'),
		).toBe(false);
	});

	it('is false when areaName is "managed", even if the key is present', () => {
		expect(
			shouldResync({ [POPUP_ITEMS_STORAGE_KEY]: { newValue: {} } }, 'managed'),
		).toBe(false);
	});

	it('is false when areaName is "local" but the key is not present in changes', () => {
		expect(shouldResync({ someOtherKey: { newValue: {} } }, 'local')).toBe(false);
	});
});

describe('syncRedirectRules', () => {
	it('reads the popup items storage key and installs the compiled rules via updateDynamicRules', async () => {
		seedStorage({ redirects: [makeRedirectItem()], isRunning: true });

		syncRedirectRules();
		await flushAsync();

		expect(chrome.storage.local.get).toHaveBeenCalledWith(
			POPUP_ITEMS_STORAGE_KEY,
			expect.any(Function),
		);
		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(1);
		const call = (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock.calls[0][0];
		expect(call.addRules).toHaveLength(1);
		expect(call.removeRuleIds).toEqual([]);
	});

	it('defaults to isRunning: true and empty items when the stored blob is entirely absent, and still issues an (empty) atomic update', async () => {
		seedStorage(undefined as never);

		syncRedirectRules();
		await flushAsync();

		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
			removeRuleIds: [],
			addRules: [],
		});
	});

	it('treats a missing "redirects" field as an empty array without crashing (pre-rename blob shape)', async () => {
		seedStorage({ mockResponses: [makeMockItem()], isRunning: true });

		expect(() => syncRedirectRules()).not.toThrow();
		await flushAsync();

		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
			removeRuleIds: [],
			addRules: [],
		});
	});

	it('when isRunning is false, still calls updateDynamicRules but with an empty addRules (actively removes stale rules)', async () => {
		seedStorage({ redirects: [makeRedirectItem()], isRunning: false });

		syncRedirectRules();
		await flushAsync();

		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
			removeRuleIds: [],
			addRules: [],
		});
	});

	it('compiles only the redirect item when mock-response items are also present in storage', async () => {
		seedStorage({
			mockResponses: [makeMockItem()],
			redirects: [makeRedirectItem({ id: 'redirect-only' })],
			isRunning: true,
		});

		syncRedirectRules();
		await flushAsync();

		const call = (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock.calls[0][0];
		expect(call.addRules).toHaveLength(1);
	});

	it('removes prior dynamic rule ids and adds the newly compiled rules in a single atomic updateDynamicRules call', async () => {
		(chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockImplementationOnce(
			(callback: (rules: chrome.declarativeNetRequest.Rule[]) => void) => {
				callback([makeExistingRule(5), makeExistingRule(9)]);
			},
		);
		seedStorage({ redirects: [makeRedirectItem({ id: 'redirect-new' })], isRunning: true });

		syncRedirectRules();
		await flushAsync();

		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(1);
		const call = (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock.calls[0][0];
		expect(call.removeRuleIds).toEqual([5, 9]);
		expect(call.addRules).toHaveLength(1);
	});

	it('logs an error and does not throw when updateDynamicRules rejects', async () => {
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		(chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mockReturnValueOnce(
			Promise.reject(new Error('boom')),
		);
		seedStorage({ redirects: [makeRedirectItem()], isRunning: true });

		expect(() => syncRedirectRules()).not.toThrow();

		await flushAsync();

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[devtools-plus] failed to sync redirect rules',
			expect.any(Error),
		);

		consoleErrorSpy.mockRestore();
	});
});

describe('serialization / overlapping calls', () => {
	it('never lets two back-to-back calls interleave their getDynamicRules/updateDynamicRules pairs', async () => {
		const order: string[] = [];
		let getCallCount = 0;
		let updateCallCount = 0;
		// Simulates the real DNR store: `updateDynamicRules` actually mutates what a subsequent
		// `getDynamicRules` will see. If the two syncs' DNR calls ever interleaved, the second
		// call's `getDynamicRules` would observe stale (pre-first-call) state instead of what the
		// first call just installed.
		let installedRules: chrome.declarativeNetRequest.Rule[] = [];

		(chrome.storage.local.get as jest.Mock)
			.mockImplementationOnce(
				(_key: string, callback: (result: Record<string, unknown>) => void) => {
					callback({
						[POPUP_ITEMS_STORAGE_KEY]: {
							redirects: [makeRedirectItem({ id: 'redirect-a' })],
							isRunning: true,
						},
					});
				},
			)
			.mockImplementationOnce(
				(_key: string, callback: (result: Record<string, unknown>) => void) => {
					callback({
						[POPUP_ITEMS_STORAGE_KEY]: {
							redirects: [makeRedirectItem({ id: 'redirect-b' })],
							isRunning: true,
						},
					});
				},
			);

		(chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockImplementation(
			(callback: (rules: chrome.declarativeNetRequest.Rule[]) => void) => {
				getCallCount += 1;
				order.push(`get-${getCallCount}`);
				callback(installedRules);
			},
		);
		(chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mockImplementation(
			({
				removeRuleIds,
				addRules,
			}: {
				removeRuleIds: number[];
				addRules: chrome.declarativeNetRequest.Rule[];
			}) => {
				updateCallCount += 1;
				order.push(`update-${updateCallCount}`);
				installedRules = installedRules
					.filter((rule) => !removeRuleIds.includes(rule.id))
					.concat(addRules);
				return Promise.resolve();
			},
		);

		// Two overlapping calls, fired synchronously back-to-back before either has resolved.
		syncRedirectRules();
		syncRedirectRules();

		await flushAsync();
		await flushAsync();

		expect(chrome.declarativeNetRequest.getDynamicRules).toHaveBeenCalledTimes(2);
		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(2);
		// The actual regression check: no two syncs' get/update pairs can interleave. If they did,
		// this would instead read something like ['get-1', 'get-2', 'update-1', 'update-2'].
		expect(order).toEqual(['get-1', 'update-1', 'get-2', 'update-2']);

		// Confirms the second call's `getDynamicRules` genuinely observed the first call's install
		// (not a stale empty snapshot): its `removeRuleIds` should match whatever the first call's
		// `updateDynamicRules` just added.
		const firstCallArgs = (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock
			.calls[0][0] as { addRules: chrome.declarativeNetRequest.Rule[] };
		const secondCallArgs = (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock
			.calls[1][0] as { removeRuleIds: number[] };
		expect(secondCallArgs.removeRuleIds).toEqual(firstCallArgs.addRules.map((rule) => rule.id));
	});

	it('keeps the serialization queue alive after a failed sync, so a queued call still runs', async () => {
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const order: string[] = [];
		let updateCallCount = 0;

		(chrome.storage.local.get as jest.Mock)
			.mockImplementationOnce(
				(_key: string, callback: (result: Record<string, unknown>) => void) => {
					callback({
						[POPUP_ITEMS_STORAGE_KEY]: {
							redirects: [makeRedirectItem({ id: 'redirect-fails' })],
							isRunning: true,
						},
					});
				},
			)
			.mockImplementationOnce(
				(_key: string, callback: (result: Record<string, unknown>) => void) => {
					callback({
						[POPUP_ITEMS_STORAGE_KEY]: {
							redirects: [makeRedirectItem({ id: 'redirect-after-failure' })],
							isRunning: true,
						},
					});
				},
			);

		(chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mockImplementation(() => {
			updateCallCount += 1;
			order.push(`update-${updateCallCount}`);
			if (updateCallCount === 1) {
				return Promise.reject(new Error('boom'));
			}
			return Promise.resolve();
		});

		syncRedirectRules();
		syncRedirectRules();

		await flushAsync();
		await flushAsync();

		expect(order).toEqual(['update-1', 'update-2']);
		expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(2);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[devtools-plus] failed to sync redirect rules',
			expect.any(Error),
		);

		consoleErrorSpy.mockRestore();
	});
});

describe('service-worker wiring (integration)', () => {
	it('calls syncRedirectRules on module load and again when the storage key changes', async () => {
		jest.resetModules();
		await import('./service-worker');

		// Module-load sync: reads storage key immediately.
		expect(chrome.storage.local.get).toHaveBeenCalledWith(
			POPUP_ITEMS_STORAGE_KEY,
			expect.any(Function),
		);
		await flushAsync();
		const callsAfterLoad = (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock
			.calls.length;
		expect(callsAfterLoad).toBeGreaterThanOrEqual(1);

		// Simulate a storage change on the popup items key; this fires the real onChanged
		// listener registered by service-worker.ts, triggering a second sync.
		await new Promise<void>((resolve) => {
			chrome.storage.local.set(
				{ [POPUP_ITEMS_STORAGE_KEY]: { redirects: [makeRedirectItem()], isRunning: true } },
				resolve,
			);
		});
		await flushAsync();

		expect(
			(chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mock.calls.length,
		).toBeGreaterThan(callsAfterLoad);
	});
});
