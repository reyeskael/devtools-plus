import { toMockResponseInit } from './toMockResponseInit';
import { seedMockResponses } from '../items/seedItems';
import type { MockResponseItem } from '../items/types';

const findById = (id: string): MockResponseItem => {
	const item = seedMockResponses.find((entry) => entry.id === id);
	if (!item) {
		throw new Error(`Fixture item "${id}" not found in seedMockResponses`);
	}
	return item;
};

describe('toMockResponseInit', () => {
	it('serializes a full JSON body into the body string', () => {
		const item = findById('mock-yearly-summary-200');

		const result = toMockResponseInit(item);

		expect(result.status).toBe(item.statusCode);
		expect(result.statusText).toBe(item.statusText);
		expect(result.body).toBe(JSON.stringify(item.body));
		expect(typeof result.body).toBe('string');
	});

	it('produces an empty body string for a bodyless 404 item', () => {
		const item = findById('mock-yearly-summary-404');

		const result = toMockResponseInit(item);

		expect(result.status).toBe(404);
		expect(result.body).toBe('');
	});

	it('produces an empty body string for a bodyless 500 item', () => {
		const item = findById('mock-yearly-summary-500');

		const result = toMockResponseInit(item);

		expect(result.status).toBe(500);
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
		const item = findById('mock-yearly-summary-200');

		const result = toMockResponseInit(item);

		expect(result).toEqual({
			status: item.statusCode,
			statusText: item.statusText,
			body: JSON.stringify(item.body),
		});
	});
});
