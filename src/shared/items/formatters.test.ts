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
	it('renders "ALL" when methods is omitted, meaning the rule applies to every method', () => {
		const item: RedirectRuleItem = {
			id: 'rule-redirect-old-path',
			name: 'Redirect old path',
			kind: 'redirect',
			enabled: false,
			matchType: 'wildcard',
			urlPattern: '/old/path',
			destination: '/new/path',
		};

		expect(formatRedirectSummary(item)).toBe('ALL /old/path → /new/path');
	});

	it('renders "ALL" when methods is an empty array', () => {
		const item: RedirectRuleItem = {
			id: 'rule-empty-methods',
			name: 'Empty methods rule',
			kind: 'redirect',
			enabled: true,
			matchType: 'wildcard',
			urlPattern: '/api/public/*',
			destination: 'https://localhost:3000/$1',
			methods: [],
		};

		expect(formatRedirectSummary(item)).toBe('ALL /api/public/* → https://localhost:3000/$1');
	});

	it('renders a comma-joined method list when methods is a non-empty scoped list', () => {
		const item: RedirectRuleItem = {
			id: 'rule-scoped-methods',
			name: 'Scoped methods rule',
			kind: 'redirect',
			enabled: true,
			matchType: 'wildcard',
			urlPattern: '*.js',
			destination: 'https://localhost:3000/$1',
			methods: ['GET', 'POST'],
		};

		expect(formatRedirectSummary(item)).toBe('GET,POST *.js → https://localhost:3000/$1');
	});

	it('renders a single scoped method without a trailing comma', () => {
		const item: RedirectRuleItem = {
			id: 'rule-single-method',
			name: 'Single method rule',
			kind: 'redirect',
			enabled: true,
			matchType: 'regex',
			urlPattern: '^/api/v1/(.*)$',
			destination: '/api/v2/$1',
			methods: ['DELETE'],
		};

		expect(formatRedirectSummary(item)).toBe('DELETE ^/api/v1/(.*)$ → /api/v2/$1');
	});
});
