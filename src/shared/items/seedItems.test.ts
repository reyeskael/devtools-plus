import { seedHttpRules, seedMockResponses } from './seedItems';

describe('seedItems', () => {
	it('seedMockResponses is a non-empty array', () => {
		expect(Array.isArray(seedMockResponses)).toBe(true);
		expect(seedMockResponses.length).toBeGreaterThan(0);
	});

	it('seedHttpRules is a non-empty array', () => {
		expect(Array.isArray(seedHttpRules)).toBe(true);
		expect(seedHttpRules.length).toBeGreaterThan(0);
	});

	it('every entry in seedMockResponses has kind === "mock-response"', () => {
		seedMockResponses.forEach((item) => {
			expect(item.kind).toBe('mock-response');
		});
	});

	it('every entry in seedHttpRules has kind === "http-rule"', () => {
		seedHttpRules.forEach((item) => {
			expect(item.kind).toBe('http-rule');
		});
	});

	it('no id string appears in both seedMockResponses and seedHttpRules', () => {
		const mockResponseIds = new Set(seedMockResponses.map((item) => item.id));
		const httpRuleIds = new Set(seedHttpRules.map((item) => item.id));

		const overlap = [...mockResponseIds].filter((id) => httpRuleIds.has(id));

		expect(overlap).toEqual([]);
	});

	it('seedMockResponses contains at least one enabled and one disabled entry', () => {
		expect(seedMockResponses.some((item) => item.enabled === true)).toBe(true);
		expect(seedMockResponses.some((item) => item.enabled === false)).toBe(true);
	});

	it('seedHttpRules contains at least one enabled and one disabled entry', () => {
		expect(seedHttpRules.some((item) => item.enabled === true)).toBe(true);
		expect(seedHttpRules.some((item) => item.enabled === false)).toBe(true);
	});
});
