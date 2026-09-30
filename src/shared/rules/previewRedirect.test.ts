import { previewRedirect } from './previewRedirect';
import type { RedirectRuleItem } from '../items/types';

type PreviewItem = Pick<RedirectRuleItem, 'matchType' | 'urlPattern' | 'destination'>;

const makePreviewItem = (overrides: Partial<PreviewItem> = {}): PreviewItem => ({
	matchType: 'wildcard',
	urlPattern: 'https://prod.example.com/api/*',
	destination: 'https://localhost:3000/api/$1',
	...overrides,
});

describe('previewRedirect', () => {
	it('matches a wildcard pattern against sampleUrl and substitutes $1 with the captured group', () => {
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'wildcard',
				urlPattern: 'https://prod.example.com/api/*',
				destination: 'https://localhost:3000/api/$1',
			}),
			'https://prod.example.com/api/users',
		);
		expect(result).toEqual({
			matched: true,
			result: 'https://localhost:3000/api/users',
		});
	});

	it('returns { matched: false } with no result when the pattern does not match sampleUrl', () => {
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'wildcard',
				urlPattern: 'https://prod.example.com/api/*',
			}),
			'https://other.example.com/api/users',
		);
		expect(result).toEqual({ matched: false });
		expect(result.result).toBeUndefined();
	});

	it('uses the raw pattern as-is (no wildcard conversion) when matchType is "regex"', () => {
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'regex',
				urlPattern: '^/api/(\\d+)/detail$',
				destination: '/detail/$1',
			}),
			'/api/42/detail',
		);
		expect(result).toEqual({ matched: true, result: '/detail/42' });
	});

	describe('whole-URL replacement semantics', () => {
		it('drops the sampleUrl query string when the destination does not reference it via a capture group', () => {
			const result = previewRedirect(
				makePreviewItem({
					matchType: 'wildcard',
					urlPattern: 'https://prod.example.com/api/users',
					destination: 'https://localhost:3000/api/users',
				}),
				'https://prod.example.com/api/users?page=2&sort=asc',
			);
			expect(result).toEqual({
				matched: true,
				result: 'https://localhost:3000/api/users',
			});
		});

		it('preserves the query string when the pattern captures it and the destination references it', () => {
			const result = previewRedirect(
				makePreviewItem({
					matchType: 'wildcard',
					urlPattern: 'https://prod.example.com/api/users*',
					destination: 'https://localhost:3000/api/users$1',
				}),
				'https://prod.example.com/api/users?page=2&sort=asc',
			);
			expect(result).toEqual({
				matched: true,
				result: 'https://localhost:3000/api/users?page=2&sort=asc',
			});
		});
	});

	it('collapses "$$" to a literal "$" in the substituted result, not a capture ref', () => {
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'wildcard',
				urlPattern: 'https://prod.example.com/api/users',
				destination: 'https://localhost:3000/pay?amount=$$100',
			}),
			'https://prod.example.com/api/users',
		);
		expect(result).toEqual({
			matched: true,
			result: 'https://localhost:3000/pay?amount=$100',
		});
	});

	it('substitutes an empty string for a capture ref whose group did not participate in the match', () => {
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'regex',
				urlPattern: '^/api/users(/(\\d+))?$',
				destination: '/users-optional-id-$2',
			}),
			'/api/users',
		);
		expect(result).toEqual({
			matched: true,
			result: '/users-optional-id-',
		});
	});

	it('collapses a "$$" with no adjacent digit to a literal "$", even with no real capture ref present', () => {
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'wildcard',
				urlPattern: 'https://prod.example.com/api/users',
				destination: 'https://localhost:3000/pay?ref=$$order',
			}),
			'https://prod.example.com/api/users',
		);
		expect(result).toEqual({
			matched: true,
			result: 'https://localhost:3000/pay?ref=$order',
		});
	});

	it('returns { matched: false } instead of throwing when matchType is "regex" and urlPattern is not valid regex syntax', () => {
		// A live pattern tester sees invalid regex mid-edit (e.g. an unclosed group) and must not crash.
		const result = previewRedirect(
			makePreviewItem({
				matchType: 'regex',
				urlPattern: '(unclosed',
			}),
			'/api/users',
		);
		expect(result).toEqual({ matched: false });
	});
});
