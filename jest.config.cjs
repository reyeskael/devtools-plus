/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	// wouter ships ESM-only source with no CJS build; let ts-jest transform it (and its ESM-only
	// deps) instead of leaving it for Jest's default CommonJS-only handling of node_modules.
	transformIgnorePatterns: ['/node_modules/(?!(wouter|regexparam|use-sync-external-store)/)'],
	transform: {
		'^.+\\.(t|j)sx?$': ['ts-jest', {}],
	},
};
