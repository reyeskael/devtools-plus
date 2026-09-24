import type { HttpRuleItem, MockResponseItem } from './types';

export const seedMockResponses: MockResponseItem[] = [
	{
		id: 'mock-users-list',
		name: 'Users list',
		kind: 'mock-response',
		enabled: true,
		method: 'GET',
		urlPattern: '/api/users',
		statusCode: 200,
	},
	{
		id: 'mock-create-order',
		name: 'Create order failure',
		kind: 'mock-response',
		enabled: false,
		method: 'POST',
		urlPattern: '/api/orders',
		statusCode: 500,
		body: '{ "error": "Internal Server Error" }',
	},
	{
		id: 'mock-delete-account',
		name: 'Delete account',
		kind: 'mock-response',
		enabled: true,
		method: 'DELETE',
		urlPattern: '/api/accounts/*',
		statusCode: 204,
	},
];

export const seedHttpRules: HttpRuleItem[] = [
	{
		id: 'rule-block-legacy',
		name: 'Block legacy API',
		kind: 'http-rule',
		enabled: true,
		urlPattern: '/api/legacy/*',
		action: 'block',
	},
	{
		id: 'rule-redirect-old-path',
		name: 'Redirect old path',
		kind: 'http-rule',
		enabled: false,
		urlPattern: '/old/path',
		action: 'redirect',
		target: '/new/path',
	},
	{
		id: 'rule-strip-auth-header',
		name: 'Strip auth header',
		kind: 'http-rule',
		enabled: true,
		urlPattern: '/api/public/*',
		action: 'modify-headers',
	},
];
