import '@testing-library/jest-dom';

(globalThis as unknown as { chrome: typeof chrome }).chrome = {
	tabs: {
		create: jest.fn(),
	},
	runtime: {
		getURL: jest.fn((path: string) => path),
	},
} as unknown as typeof chrome;
