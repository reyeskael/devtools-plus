import { makeResponse } from './makeResponse';
import { toMockResponseInit } from '../toMockResponseInit';
import { seedMockResponses } from '../../items/seedItems';
import type { MockResponseItem } from '../../items/types';
import type { MockResponseInit } from '../toMockResponseInit';

const findById = (id: string): MockResponseItem => {
	const item = seedMockResponses.find((entry) => entry.id === id);
	if (!item) {
		throw new Error(`Fixture item "${id}" not found in seedMockResponses`);
	}
	return item;
};

describe('makeResponse', () => {
	it('builds a FakeResponse from a full JSON body 200 item', async () => {
		const item = findById('mock-yearly-summary-200');
		const init = toMockResponseInit(item);

		const response = makeResponse(init);

		expect(response.status).toBe(item.statusCode);
		expect(response.statusText).toBe(item.statusText);
		expect(response.body).toBe(JSON.stringify(item.body));
		expect(response.ok).toBe(true);
		await expect(response.text()).resolves.toBe(JSON.stringify(item.body));
		await expect(response.json()).resolves.toEqual(item.body);
	});

	it('builds a FakeResponse from a bodyless 404 item', async () => {
		const item = findById('mock-yearly-summary-404');
		const init = toMockResponseInit(item);

		const response = makeResponse(init);

		expect(response.status).toBe(404);
		expect(response.statusText).toBe(item.statusText);
		expect(response.body).toBe('');
		expect(response.ok).toBe(false);
		await expect(response.text()).resolves.toBe('');
		await expect(response.json()).resolves.toBeUndefined();
	});

	it('builds a FakeResponse from a bodyless 500 item', async () => {
		const item = findById('mock-yearly-summary-500');
		const init = toMockResponseInit(item);

		const response = makeResponse(init);

		expect(response.status).toBe(500);
		expect(response.body).toBe('');
		expect(response.ok).toBe(false);
		await expect(response.text()).resolves.toBe('');
		await expect(response.json()).resolves.toBeUndefined();
	});

	it('rejects json() instead of throwing synchronously on invalid JSON body', async () => {
		const init: MockResponseInit = { status: 200, statusText: 'OK', body: 'not-json' };

		let jsonPromise: Promise<unknown>;
		expect(() => {
			jsonPromise = makeResponse(init).json();
		}).not.toThrow();
		await expect(jsonPromise!).rejects.toThrow();
	});
});
