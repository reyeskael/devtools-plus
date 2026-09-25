import { seedHttpRules, seedMockResponses } from './seedItems';

describe('seedItems', () => {
	// The bundled mock-response JSON seed was retired in favor of Import — mock
	// responses now only ever come from a user's imported file, never from a
	// shipped default. This test documents that intentional emptiness.
	it('seedMockResponses is an empty array', () => {
		expect(Array.isArray(seedMockResponses)).toBe(true);
		expect(seedMockResponses).toEqual([]);
	});

	it('seedHttpRules is a non-empty array', () => {
		expect(Array.isArray(seedHttpRules)).toBe(true);
		expect(seedHttpRules.length).toBeGreaterThan(0);
	});

	it('every entry in seedHttpRules has kind === "http-rule"', () => {
		seedHttpRules.forEach((item) => {
			expect(item.kind).toBe('http-rule');
		});
	});

	it('seedHttpRules contains at least one enabled and one disabled entry', () => {
		expect(seedHttpRules.some((item) => item.enabled === true)).toBe(true);
		expect(seedHttpRules.some((item) => item.enabled === false)).toBe(true);
	});
});
