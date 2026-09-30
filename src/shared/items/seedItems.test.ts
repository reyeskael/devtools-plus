import { seedMockResponses } from './seedItems';

describe('seedItems', () => {
	// The bundled mock-response JSON seed was retired in favor of Import — mock
	// responses now only ever come from a user's imported file, never from a
	// shipped default. This test documents that intentional emptiness.
	it('seedMockResponses is an empty array', () => {
		expect(Array.isArray(seedMockResponses)).toBe(true);
		expect(seedMockResponses).toEqual([]);
	});
});
