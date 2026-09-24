import type { FakeResponse } from './makeResponse';

const defaultResponse: FakeResponse = {
	status: 200,
	statusText: 'OK',
	body: '',
	ok: true,
	text: () => Promise.resolve(''),
	json: () => Promise.resolve(undefined),
};

export const createOriginalFetch = (response: FakeResponse = defaultResponse) =>
	jest.fn().mockResolvedValue(response);
