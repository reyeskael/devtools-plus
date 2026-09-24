import { findMatchingMock } from './matchMock';
import { seedMockResponses } from '../items/seedItems';
import type { HttpRuleItem, MockResponseItem, PopupItem } from '../items/types';

const yearlySummary200 = seedMockResponses.find(
	(item) => item.id === 'mock-yearly-summary-200',
) as MockResponseItem;

const httpRuleWithMatchingPattern: HttpRuleItem = {
	id: 'rule-matches-mock-pattern',
	name: 'Rule sharing a pattern with a mock',
	kind: 'http-rule',
	enabled: true,
	urlPattern: 'api/users',
	action: 'block',
};

const mockUsersGet: MockResponseItem = {
	id: 'mock-users-get',
	name: 'Users list',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/users',
	statusCode: 200,
};

describe('findMatchingMock', () => {
	it('matches a urlPattern with a leading slash against an absolute URL', () => {
		const items: PopupItem[] = [mockUsersGet];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/users' }),
		).toBe(mockUsersGet);
	});

	it('matches a urlPattern without a leading slash against an absolute URL', () => {
		const item: MockResponseItem = { ...mockUsersGet, urlPattern: 'api/users' };
		const items: PopupItem[] = [item];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/users' }),
		).toBe(item);
	});

	it('does not match when the urlPattern case differs from the resolved URL', () => {
		const item: MockResponseItem = { ...mockUsersGet, urlPattern: '/API/USERS' };
		const items: PopupItem[] = [item];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/users' }),
		).toBeUndefined();
	});

	it('resolves a relative url against the provided baseUrl before matching', () => {
		const items: PopupItem[] = [mockUsersGet];

		expect(
			findMatchingMock(items, {
				method: 'GET',
				url: '/api/users',
				baseUrl: 'https://example.com',
			}),
		).toBe(mockUsersGet);
	});

	it('falls back to matching the raw url string when baseUrl is missing for a relative url', () => {
		const item: MockResponseItem = { ...mockUsersGet, urlPattern: '/api/users' };
		const items: PopupItem[] = [item];

		expect(findMatchingMock(items, { method: 'GET', url: '/api/users' })).toBe(item);
	});

	it('falls back to matching the raw url string when baseUrl is invalid for a relative url', () => {
		const item: MockResponseItem = { ...mockUsersGet, urlPattern: '/api/users' };
		const items: PopupItem[] = [item];

		expect(
			findMatchingMock(items, {
				method: 'GET',
				url: '/api/users',
				baseUrl: 'not a valid url',
			}),
		).toBe(item);
	});

	it('never throws for a relative url with a missing or invalid baseUrl', () => {
		const items: PopupItem[] = [mockUsersGet];

		expect(() =>
			findMatchingMock(items, { method: 'GET', url: '/api/users' }),
		).not.toThrow();
		expect(() =>
			findMatchingMock(items, {
				method: 'GET',
				url: '/api/users',
				baseUrl: 'not a valid url',
			}),
		).not.toThrow();
	});

	it('matches the method case-insensitively', () => {
		const items: PopupItem[] = [mockUsersGet];

		expect(
			findMatchingMock(items, { method: 'get', url: 'https://example.com/api/users' }),
		).toBe(mockUsersGet);
	});

	it('filters out items with enabled: false', () => {
		const disabledItem: MockResponseItem = { ...mockUsersGet, enabled: false };
		const items: PopupItem[] = [disabledItem];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/users' }),
		).toBeUndefined();
	});

	it('ignores http-rule items even when their urlPattern would otherwise match', () => {
		const items: PopupItem[] = [httpRuleWithMatchingPattern];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/users' }),
		).toBeUndefined();
	});

	it('returns the first matching candidate in array order when multiple items are enabled and match', () => {
		const first: MockResponseItem = { ...mockUsersGet, id: 'mock-users-first' };
		const second: MockResponseItem = { ...mockUsersGet, id: 'mock-users-second' };
		const items: PopupItem[] = [first, second];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/users' }),
		).toBe(first);
	});

	it('returns undefined when no item matches', () => {
		const items: PopupItem[] = [mockUsersGet];

		expect(
			findMatchingMock(items, { method: 'GET', url: 'https://example.com/api/orders' }),
		).toBeUndefined();
	});

	it('matches the enabled 200 entry from the real sample data by method and url', () => {
		expect(
			findMatchingMock(seedMockResponses, {
				method: 'GET',
				url: 'https://host.example.com/api/excite/v2/account-summary-api/v1/summary/yearly',
			}),
		).toBe(yearlySummary200);
	});
});
