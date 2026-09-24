import { createOriginalFetch } from './originalFetch';
import { makeResponse } from './makeResponse';
import { toMockResponseInit } from '../toMockResponseInit';
import { seedMockResponses } from '../../items/seedItems';
import type { MockResponseItem } from '../../items/types';

const findById = (id: string): MockResponseItem => {
	const item = seedMockResponses.find((entry) => entry.id === id);
	if (!item) {
		throw new Error(`Fixture item "${id}" not found in seedMockResponses`);
	}
	return item;
};

describe('createOriginalFetch', () => {
	it('resolves to a sane default 200 OK response when called with no args', async () => {
		const originalFetch = createOriginalFetch();

		const response = await originalFetch('https://example.com/api/users');

		expect(response.status).toBe(200);
		expect(response.statusText).toBe('OK');
		expect(response.ok).toBe(true);
		await expect(response.text()).resolves.toBe('');
		await expect(response.json()).resolves.toBeUndefined();
	});

	it('is a jest mock whose call args can be asserted', async () => {
		const originalFetch = createOriginalFetch();

		await originalFetch('https://example.com/api/users', { method: 'GET' });

		expect(originalFetch).toHaveBeenCalledWith('https://example.com/api/users', {
			method: 'GET',
		});
	});

	it('produces independent mocks across separate calls to the factory', async () => {
		const firstFetch = createOriginalFetch();
		const secondFetch = createOriginalFetch();

		await firstFetch('https://example.com/api/first');

		expect(firstFetch).toHaveBeenCalledTimes(1);
		expect(secondFetch).not.toHaveBeenCalled();
		expect(secondFetch.mock.calls).toEqual([]);
	});

	it('resolves to a custom response when one is provided', async () => {
		const item = findById('mock-yearly-summary-200');
		const customResponse = makeResponse(toMockResponseInit(item));

		const originalFetch = createOriginalFetch(customResponse);

		const response = await originalFetch('https://example.com/api/yearly-summary');

		expect(response).toBe(customResponse);
		expect(response.status).toBe(item.statusCode);
		await expect(response.json()).resolves.toEqual(item.body);
	});
});
