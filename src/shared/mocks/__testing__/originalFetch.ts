import type { FakeResponse } from './makeResponse';

const defaultResponse: FakeResponse = {
	status: 200,
	statusText: 'OK',
	body: '',
	ok: true,
	text: () => Promise.resolve(''),
	json: () => Promise.resolve(undefined),
};

/**
 * Test double for the fetch interceptor's `originalFetch` dependency.
 *
 * @param response - The fake response the mock should resolve with.
 * @returns A jest mock function resolving to `response`.
 */
export const createOriginalFetch = (response: FakeResponse = defaultResponse) =>
	jest.fn().mockResolvedValue(response);
