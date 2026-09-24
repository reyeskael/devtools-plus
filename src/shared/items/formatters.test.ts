import { formatHttpRuleSummary, formatMockResponseSummary } from './formatters';
import type { HttpRuleItem, MockResponseItem } from './types';

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

describe('formatHttpRuleSummary', () => {
	it('formats action and urlPattern without a target when target is absent', () => {
		const item: HttpRuleItem = {
			id: 'rule-block-legacy',
			name: 'Block legacy API',
			kind: 'http-rule',
			enabled: true,
			urlPattern: '/api/legacy/*',
			action: 'block',
		};

		expect(formatHttpRuleSummary(item)).toBe('block /api/legacy/*');
	});

	it('appends the target with an arrow when target is present', () => {
		const item: HttpRuleItem = {
			id: 'rule-redirect-old-path',
			name: 'Redirect old path',
			kind: 'http-rule',
			enabled: false,
			urlPattern: '/old/path',
			action: 'redirect',
			target: '/new/path',
		};

		expect(formatHttpRuleSummary(item)).toBe('redirect /old/path → /new/path');
	});

	it('omits the target arrow when target is an empty string (falsy)', () => {
		const item: HttpRuleItem = {
			id: 'rule-empty-target',
			name: 'Empty target rule',
			kind: 'http-rule',
			enabled: true,
			urlPattern: '/api/public/*',
			action: 'modify-headers',
			target: '',
		};

		expect(formatHttpRuleSummary(item)).toBe('modify-headers /api/public/*');
	});
});
