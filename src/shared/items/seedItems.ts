import type { HttpRuleItem, MockResponseItem } from './types';

/** Default mock responses `ItemsStateContext` renders before storage hydration completes. */
export const seedMockResponses: MockResponseItem[] = [];

/** Default HTTP rules `ItemsStateContext` renders before storage hydration completes. */
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
