import { createItemId } from './createItemId';

const UUID_V4_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createItemId', () => {
	it('returns a string', () => {
		expect(typeof createItemId()).toBe('string');
	});

	it('returns a v4 UUID', () => {
		expect(createItemId()).toMatch(UUID_V4_PATTERN);
	});

	it('returns a different value on each call', () => {
		expect(createItemId()).not.toBe(createItemId());
	});

	it('delegates to crypto.randomUUID', () => {
		const spy = jest.spyOn(crypto, 'randomUUID');

		const id = createItemId();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveReturnedWith(id);

		spy.mockRestore();
	});
});
