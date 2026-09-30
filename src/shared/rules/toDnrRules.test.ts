import { toDnrRules } from './toDnrRules';
import { dollarRefsToBackslash, wildcardToRegex } from './pattern';
import type { MockResponseItem, RedirectRuleItem } from '../items/types';

const makeRedirectItem = (overrides: Partial<RedirectRuleItem> = {}): RedirectRuleItem => ({
	id: 'rule-1',
	name: 'Rule One',
	kind: 'redirect',
	enabled: true,
	matchType: 'wildcard',
	urlPattern: '/api/users',
	destination: '/api/users-new',
	...overrides,
});

const makeMockItem = (overrides: Partial<MockResponseItem> = {}): MockResponseItem => ({
	id: 'mock-1',
	name: 'Mock One',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/a',
	statusCode: 200,
	statusText: 'OK',
	...overrides,
});

describe('toDnrRules', () => {
	describe('condition.urlFilter / regexFilter', () => {
		it('uses urlFilter when urlPattern has no "*" and matchType is "wildcard"', () => {
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'wildcard', urlPattern: '/api/v1/users' })],
				true,
			);
			expect(rules[0].condition.urlFilter).toBe('/api/v1/users');
			expect(rules[0].condition.regexFilter).toBeUndefined();
		});

		it('uses regexFilter, compiled via wildcardToRegex, when urlPattern contains "*"', () => {
			const pattern = '/api/*/users/*';
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'wildcard', urlPattern: pattern })],
				true,
			);
			expect(rules[0].condition.regexFilter).toBe(wildcardToRegex(pattern));
			expect(rules[0].condition.urlFilter).toBeUndefined();
		});

		it('uses regexFilter, compiled via wildcardToRegex, when a wildcard-free urlPattern contains "^"', () => {
			// DNR's urlFilter treats "^" as a special separator wildcard with no escape sequence, so a
			// literal "^" must go through regexFilter instead, where wildcardToRegex escapes it.
			const pattern = '/api/users?ref=a^b';
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'wildcard', urlPattern: pattern })],
				true,
			);
			expect(rules[0].condition.regexFilter).toBe(wildcardToRegex(pattern));
			expect(rules[0].condition.regexFilter).toBe('/api/users\\?ref=a\\^b');
			expect(rules[0].condition.urlFilter).toBeUndefined();
		});

		it('uses regexFilter with the raw urlPattern as the regex source when matchType is "regex", even with no "*"', () => {
			const pattern = '^/api/(\\d+)/detail$';
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'regex', urlPattern: pattern })],
				true,
			);
			expect(rules[0].condition.regexFilter).toBe(pattern);
			expect(rules[0].condition.urlFilter).toBeUndefined();
		});

		it('uses urlFilter when urlPattern is literal and destination has no $1-$9 ref (cheap path unchanged)', () => {
			const pattern = '/api/users';
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'wildcard', urlPattern: pattern, destination: '/api/users-new' })],
				true,
			);
			expect(rules[0].condition.urlFilter).toBe(pattern);
			expect(rules[0].condition.regexFilter).toBeUndefined();
			expect(rules[0].action.redirect).toEqual({ url: '/api/users-new' });
		});

		it('uses regexFilter, not urlFilter, when a literal urlPattern is paired with a destination containing a $1-$9 ref', () => {
			// A literal pattern (no "*", no "^", matchType "wildcard") would otherwise be eligible for
			// the cheap urlFilter path, but the destination genuinely references a capture group, so
			// the action must use regexSubstitution -- which DNR only allows paired with a regexFilter
			// condition, never urlFilter. Compiling condition.urlFilter + action.regexSubstitution here
			// would be an invalid DNR rule that updateDynamicRules() rejects.
			const pattern = '/api/users';
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'wildcard', urlPattern: pattern, destination: '/detail/$1' })],
				true,
			);
			expect(rules[0].condition.regexFilter).toBe(wildcardToRegex(pattern));
			// No "*" in the pattern means wildcardToRegex produces a plain escaped literal with no
			// capture groups -- what "$1" substitutes against in a real DNR match is a separate,
			// pre-existing authoring-correctness concern, not something this compiler needs to solve.
			expect(rules[0].condition.regexFilter).toBe('/api/users');
			expect(rules[0].condition.urlFilter).toBeUndefined();
			expect(rules[0].action.redirect).toEqual({ regexSubstitution: '/detail/\\1' });
		});
	});

	describe('action.redirect', () => {
		it('uses redirect.url when destination has no $1-$9 ref', () => {
			const rules = toDnrRules(
				[makeRedirectItem({ destination: 'https://localhost:3000/api/users' })],
				true,
			);
			expect(rules[0].action.redirect).toEqual({ url: 'https://localhost:3000/api/users' });
		});

		it('collapses "$$" to a literal "$" in a static destination via redirect.url', () => {
			const rules = toDnrRules(
				[makeRedirectItem({ destination: 'https://localhost:3000/api?ref=$$abc' })],
				true,
			);
			expect(rules[0].action.redirect).toEqual({
				url: 'https://localhost:3000/api?ref=$abc',
			});
		});

		it('does not misdetect "$$" immediately followed by a digit 1-9 as a real capture ref', () => {
			// `hasCaptureRef` is escape-aware, the same way `dollarRefsToBackslash` parses "$$": a
			// static destination like "$$100" (meant as the literal "$100") must not be detected as
			// containing a `$1` capture ref, since this item's condition uses `urlFilter` (no regex) —
			// picking `regexSubstitution` here would produce a DNR rule with a mismatched
			// condition/action combination.
			const rules = toDnrRules(
				[
					makeRedirectItem({
						matchType: 'wildcard',
						urlPattern: '/api/users', // no "*" -> condition uses urlFilter, not regexFilter
						destination: 'https://localhost:3000/api?amount=$$100',
					}),
				],
				true,
			);
			expect(rules[0].condition.urlFilter).toBe('/api/users');
			expect(rules[0].condition.regexFilter).toBeUndefined();
			expect(rules[0].action.redirect).toEqual({
				url: 'https://localhost:3000/api?amount=$100',
			});
		});

		it('uses redirect.regexSubstitution, backslash-translated, when destination contains a $1-$9 ref', () => {
			const destination = 'https://localhost:3000/$1/detail';
			const rules = toDnrRules(
				[makeRedirectItem({ matchType: 'wildcard', urlPattern: '/api/*/detail', destination })],
				true,
			);
			expect(rules[0].action.redirect).toEqual({
				regexSubstitution: dollarRefsToBackslash(destination),
			});
			expect(rules[0].action.redirect).toEqual({
				regexSubstitution: 'https://localhost:3000/\\1/detail',
			});
		});

		it('action.type is always "redirect"', () => {
			const rules = toDnrRules(
				[makeRedirectItem(), makeRedirectItem({ id: 'rule-2', destination: '/x/$1' })],
				true,
			);
			for (const rule of rules) {
				expect(rule.action.type).toBe('redirect');
			}
		});
	});

	describe('condition.requestMethods', () => {
		it('is present, lowercased, when item.methods is a non-empty array', () => {
			const rules = toDnrRules([makeRedirectItem({ methods: ['GET', 'POST'] })], true);
			expect(rules[0].condition.requestMethods).toEqual(['get', 'post']);
		});

		it('is absent when methods is omitted', () => {
			const rules = toDnrRules([makeRedirectItem({ methods: undefined })], true);
			expect(rules[0].condition.requestMethods).toBeUndefined();
		});

		it('is absent when methods is an empty array', () => {
			const rules = toDnrRules([makeRedirectItem({ methods: [] })], true);
			expect(rules[0].condition.requestMethods).toBeUndefined();
		});
	});

	describe('condition.resourceTypes', () => {
		it('is always exactly the fixed resource type list, in order, and never includes main_frame', () => {
			const rules = toDnrRules([makeRedirectItem()], true);
			expect(rules[0].condition.resourceTypes).toEqual([
				'xmlhttprequest',
				'script',
				'image',
				'stylesheet',
				'font',
				'media',
				'sub_frame',
				'object',
				'ping',
				'other',
			]);
			expect(rules[0].condition.resourceTypes).not.toContain('main_frame');
		});
	});

	describe('filtering', () => {
		it('excludes disabled items entirely', () => {
			const rules = toDnrRules(
				[makeRedirectItem({ id: 'disabled-1', enabled: false })],
				true,
			);
			expect(rules).toEqual([]);
		});

		it('ignores non-redirect (mock-response) items, and they do not affect priority numbering of surrounding redirect items', () => {
			const items = [
				makeRedirectItem({ id: 'first' }),
				makeMockItem({ id: 'middle-mock' }),
				makeRedirectItem({ id: 'last' }),
			];
			const rules = toDnrRules(items, true);
			expect(rules).toHaveLength(2);
			// priority = items.length - index, using the *real* index in the full items array.
			expect(rules[0].priority).toBe(items.length - 0); // 'first' at index 0
			expect(rules[1].priority).toBe(items.length - 2); // 'last' at index 2, not re-numbered to 1
		});

		it('returns [] when isRunning is false, regardless of enabled redirect items present', () => {
			const rules = toDnrRules([makeRedirectItem(), makeRedirectItem({ id: 'rule-2' })], false);
			expect(rules).toEqual([]);
		});
	});

	describe('priority', () => {
		it('derives priority from index: items.length - index, first item highest', () => {
			const items = [
				makeRedirectItem({ id: 'a' }),
				makeRedirectItem({ id: 'b' }),
				makeRedirectItem({ id: 'c' }),
			];
			const rules = toDnrRules(items, true);
			expect(rules.map((r) => r.priority)).toEqual([3, 2, 1]);
		});
	});

	describe('id', () => {
		it('is deterministic across separate calls with the same item id', () => {
			const first = toDnrRules([makeRedirectItem({ id: 'stable-id' })], true);
			const second = toDnrRules([makeRedirectItem({ id: 'stable-id' })], true);
			expect(first[0].id).toBe(second[0].id);
		});

		it('differs for two items with different string ids', () => {
			const rules = toDnrRules(
				[makeRedirectItem({ id: 'rule-alpha' }), makeRedirectItem({ id: 'rule-beta' })],
				true,
			);
			expect(rules[0].id).not.toBe(rules[1].id);
		});

		it('is always a positive integer', () => {
			const rules = toDnrRules(
				[makeRedirectItem({ id: 'rule-alpha' }), makeRedirectItem({ id: '' })],
				true,
			);
			for (const rule of rules) {
				expect(Number.isInteger(rule.id)).toBe(true);
				expect(rule.id).toBeGreaterThan(0);
			}
		});
	});
});
