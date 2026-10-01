import { formatMockResponseSummary, formatRedirectSummary } from './formatters';
import type { MockResponseItem, RedirectRuleItem } from './types';

describe('formatMockResponseSummary', () => {
	it('formats method, urlPattern, and statusCode into a summary string', () => {
		const item: MockResponseItem = {
			id: 'mock-users-list',
			name: 'Users list',
			kind: 'mock-response',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/users',
			statusCode: 200,
		};

		expect(formatMockResponseSummary(item)).toBe('GET /api/users → 200');
	});

	it('formats a non-2xx status code the same way, regardless of an optional body', () => {
		const item: MockResponseItem = {
			id: 'mock-create-order',
			name: 'Create order failure',
			kind: 'mock-response',
			enabled: false,
			method: 'POST',
			urlPattern: '/api/orders',
			statusCode: 500,
			body: '{ "error": "Internal Server Error" }',
		};

		expect(formatMockResponseSummary(item)).toBe('POST /api/orders → 500');
	});
});

describe('formatRedirectSummary', () => {
	it('formats urlPattern and destination into a summary string', () => {
		const item: RedirectRuleItem = {
			id: 'rule-redirect-old-path',
			name: 'Redirect old path',
			kind: 'redirect',
			enabled: false,
			matchType: 'wildcard',
			urlPattern: '/old/path',
			destination: '/new/path',
		};

		expect(formatRedirectSummary(item)).toBe('/old/path → /new/path');
	});

	it('formats a regex pattern the same way', () => {
		const item: RedirectRuleItem = {
			id: 'rule-single-method',
			name: 'Single method rule',
			kind: 'redirect',
			enabled: true,
			matchType: 'regex',
			urlPattern: '^/api/v1/(.*)$',
			destination: '/api/v2/$1',
		};

		expect(formatRedirectSummary(item)).toBe('^/api/v1/(.*)$ → /api/v2/$1');
	});
});
