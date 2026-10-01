import '@testing-library/jest-dom';

const storageData: Record<string, unknown> = {};

type StorageListener = (
	changes: Record<string, chrome.storage.StorageChange>,
	areaName: chrome.storage.AreaName,
) => void;

const onChangedListeners = new Set<StorageListener>();

(globalThis as unknown as { chrome: typeof chrome }).chrome = {
	tabs: {
		create: jest.fn(),
	},
	runtime: {
		getURL: jest.fn((path: string) => path),
		getManifest: jest.fn(() => ({ version: '0.1.0' })),
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn(),
			removeListener: jest.fn(),
		},
		onInstalled: {
			addListener: jest.fn(),
			removeListener: jest.fn(),
		},
	},
	storage: {
		local: {
			get: jest.fn((key: string, callback: (result: Record<string, unknown>) => void) => {
				callback({ [key]: storageData[key] });
			}),
			set: jest.fn((items: Record<string, unknown>, callback?: () => void) => {
				const changes: Record<string, chrome.storage.StorageChange> = {};
				for (const key of Object.keys(items)) {
					changes[key] = { oldValue: storageData[key], newValue: items[key] };
				}
				Object.assign(storageData, items);
				for (const listener of [...onChangedListeners]) {
					listener(changes, 'local');
				}
				callback?.();
			}),
		},
		onChanged: {
			addListener: jest.fn((listener: StorageListener) => {
				onChangedListeners.add(listener);
			}),
			removeListener: jest.fn((listener: StorageListener) => {
				onChangedListeners.delete(listener);
			}),
		},
	},
	action: {
		setBadgeText: jest.fn(),
		setBadgeBackgroundColor: jest.fn(),
	},
	declarativeNetRequest: {
		getDynamicRules: jest.fn((callback: (rules: chrome.declarativeNetRequest.Rule[]) => void) =>
			callback([]),
		),
		updateDynamicRules: jest.fn(() => Promise.resolve()),
		isRegexSupported: jest.fn(() => Promise.resolve({ isSupported: true })),
	},
} as unknown as typeof chrome;

beforeEach(() => {
	jest.clearAllMocks();
	for (const key of Object.keys(storageData)) {
		delete storageData[key];
	}
	onChangedListeners.clear();
});
