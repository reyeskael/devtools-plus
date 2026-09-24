import sampleData from './mocks/sample-data.json';
import type { HttpRuleItem, MockResponseItem } from './types';

export const seedMockResponses = sampleData as MockResponseItem[];

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
