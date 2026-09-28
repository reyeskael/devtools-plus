import { toMockResponseInit } from './toMockResponseInit';
import type { MockResponseItem } from '../items/types';

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

describe('toMockResponseInit', () => {
	it('serializes a full JSON body into the body string', () => {
		const item = yearlySummary200;

		const result = toMockResponseInit(item);

		expect(result.status).toBe(item.statusCode);
		expect(result.statusText).toBe(item.statusText);
		expect(result.body).toBe(JSON.stringify(item.body));
		expect(typeof result.body).toBe('string');
	});

	it('produces an empty body string for a bodyless 404 item', () => {
		const item = yearlySummary404;

		const result = toMockResponseInit(item);

		expect(result.status).toBe(404);
		expect(result.body).toBe('');
	});

	it('produces an empty body string for a bodyless 500 item', () => {
		const item = yearlySummary500;

		const result = toMockResponseInit(item);

		expect(result.status).toBe(500);
		expect(result.body).toBe('');
	});

	it('strips the body for a 204 status even when a non-empty body is set', () => {
		const item: MockResponseItem = {
			id: 'mock-null-body-204',
			name: 'Null body 204',
			kind: 'mock-response',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/null-body-204',
			statusCode: 204,
			body: { this: 'should not appear' },
		};

		const result = toMockResponseInit(item);

		expect(result.status).toBe(204);
		expect(result.body).toBe('');
	});

	it('strips the body for a 205 status even when a non-empty body is set', () => {
		const item: MockResponseItem = {
			id: 'mock-null-body-205',
			name: 'Null body 205',
			kind: 'mock-response',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/null-body-205',
			statusCode: 205,
			body: { this: 'should not appear' },
		};

		const result = toMockResponseInit(item);

		expect(result.status).toBe(205);
		expect(result.body).toBe('');
	});

	it('strips the body for a 304 status even when a non-empty body is set', () => {
		const item: MockResponseItem = {
			id: 'mock-null-body-304',
			name: 'Null body 304',
			kind: 'mock-response',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/null-body-304',
			statusCode: 304,
			body: { this: 'should not appear' },
		};

		const result = toMockResponseInit(item);

		expect(result.status).toBe(304);
		expect(result.body).toBe('');
	});

	it('defaults statusText to an empty string when absent', () => {
		const item: MockResponseItem = {
			id: 'mock-no-status-text',
			name: 'No status text',
			kind: 'mock-response',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/no-status-text',
			statusCode: 204,
		};

		expect(toMockResponseInit(item).statusText).toBe('');
	});

	it('returns a plain descriptor object rather than a Response', () => {
		const item = yearlySummary200;

		const result = toMockResponseInit(item);

		expect(result).toEqual({
			status: item.statusCode,
			statusText: item.statusText,
			body: JSON.stringify(item.body),
		});
	});
});
