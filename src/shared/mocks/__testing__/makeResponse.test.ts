import { makeResponse } from './makeResponse';
import { toMockResponseInit } from '../toMockResponseInit';
import type { MockResponseItem } from '../../items/types';
import type { MockResponseInit } from '../toMockResponseInit';

// Local fixtures — seedMockResponses is an empty array (mock responses now
// come from Import, not a bundled seed), so these tests can't look items up
// by id from the module's in-memory defaults.
const yearlySummary200: MockResponseItem = {
	id: 'mock-yearly-summary-200',
	name: 'Yearly Summary - 200',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/excite/v2/account-summary-api/v1/summary/yearly',
	statusCode: 200,
	statusText: 'OK',
	body: { reports: [] },
};

const yearlySummary404: MockResponseItem = {
	id: 'mock-yearly-summary-404',
	name: 'Yearly Summary - 404',
	kind: 'mock-response',
	enabled: false,
	method: 'GET',
	urlPattern: '/api/excite/v2/account-summary-api/v1/summary/yearly',
	statusCode: 404,
	statusText: 'Not Found',
};

const yearlySummary500: MockResponseItem = {
	id: 'mock-yearly-summary-500',
	name: 'Yearly Summary - 500',
	kind: 'mock-response',
	enabled: false,
	method: 'GET',
	urlPattern: '/api/excite/v2/account-summary-api/v1/summary/yearly',
	statusCode: 500,
	statusText: 'Internal Server Error',
};

describe('makeResponse', () => {
	it('builds a FakeResponse from a full JSON body 200 item', async () => {
		const item = yearlySummary200;
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
		const item = yearlySummary404;
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
		const item = yearlySummary500;
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
