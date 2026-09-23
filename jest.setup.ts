import '@testing-library/jest-dom';

const storageData: Record<string, unknown> = {};

(globalThis as unknown as { chrome: typeof chrome }).chrome = {
	tabs: {
		create: jest.fn(),
	},
	runtime: {
		getURL: jest.fn((path: string) => path),
		getManifest: jest.fn(() => ({ version: '0.1.0' })),
	},
	storage: {
		local: {
			get: jest.fn((key: string, callback: (result: Record<string, unknown>) => void) => {
				callback({ [key]: storageData[key] });
			}),
			set: jest.fn((items: Record<string, unknown>, callback?: () => void) => {
				Object.assign(storageData, items);
				callback?.();
			}),
		},
	},
} as unknown as typeof chrome;
