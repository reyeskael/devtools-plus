import { toRedirectRuleItem, validateRedirectRuleDraft } from './redirectRuleDraft';
import type { RedirectRuleDraft, ValidateRedirectRuleDraftResult } from './redirectRuleDraft';

const validWildcardDraft: RedirectRuleDraft = {
	name: 'Local Proxy Redirect',
	matchType: 'wildcard',
	urlPattern: 'https://prod.example.com/api/*',
	destination: 'https://localhost:3000/api/$1',
	methods: [],
	enabled: true,
};

const validRegexDraft: RedirectRuleDraft = {
	name: 'Regex Redirect',
	matchType: 'regex',
	urlPattern: '^https://prod\\.example\\.com/api/(.*)$',
	destination: 'https://localhost:3000/api/$1',
	methods: [],
	enabled: true,
};

const expectOk = (
	result: ValidateRedirectRuleDraftResult,
): Extract<ValidateRedirectRuleDraftResult, { ok: true }> => {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected validateRedirectRuleDraft to succeed');
	}
	return result;
};

const expectErrors = (
	result: ValidateRedirectRuleDraftResult,
): Extract<ValidateRedirectRuleDraftResult, { ok: false }>['errors'] => {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected validateRedirectRuleDraft to fail');
	}
	return result.errors;
};

describe('validateRedirectRuleDraft', () => {
	it('accepts a fully valid wildcard draft, returning correctly parsed/typed fields', () => {
		const result = expectOk(validateRedirectRuleDraft(validWildcardDraft));

		expect(result.name).toBe('Local Proxy Redirect');
		expect(result.matchType).toBe('wildcard');
		expect(result.urlPattern).toBe('https://prod.example.com/api/*');
		expect(result.destination).toBe('https://localhost:3000/api/$1');
		expect(result.methods).toBeUndefined();
		expect(result.warnings).toEqual({});
	});

	it('accepts a fully valid regex draft, returning correctly parsed/typed fields', () => {
		const result = expectOk(validateRedirectRuleDraft(validRegexDraft));

		expect(result.name).toBe('Regex Redirect');
		expect(result.matchType).toBe('regex');
		expect(result.urlPattern).toBe('^https://prod\\.example\\.com/api/(.*)$');
		expect(result.destination).toBe('https://localhost:3000/api/$1');
		expect(result.methods).toBeUndefined();
		expect(result.warnings).toEqual({});
	});

	it.each([
		['empty string', ''],
		['whitespace only', '   '],
	])('rejects a name that is %s (after trim)', (_label, name) => {
		const errors = expectErrors(validateRedirectRuleDraft({ ...validWildcardDraft, name }));

		expect(errors.name).toBeDefined();
	});

	it('rejects an empty urlPattern', () => {
		const errors = expectErrors(
			validateRedirectRuleDraft({ ...validWildcardDraft, urlPattern: '' }),
		);

		expect(errors.urlPattern).toBeDefined();
	});

	it('rejects an invalid regex urlPattern when matchType is "regex" (unclosed group)', () => {
		const errors = expectErrors(
			validateRedirectRuleDraft({ ...validRegexDraft, urlPattern: '(' }),
		);

		expect(errors.urlPattern).toBeDefined();
	});

	it('does NOT reject the same literal pattern under matchType "wildcard", since wildcard compilation cannot throw', () => {
		const result = expectOk(
			validateRedirectRuleDraft({ ...validWildcardDraft, urlPattern: '(' }),
		);

		expect(result.urlPattern).toBe('(');
	});

	it('rejects an empty destination', () => {
		const errors = expectErrors(
			validateRedirectRuleDraft({ ...validWildcardDraft, destination: '' }),
		);

		expect(errors.destination).toBeDefined();
	});

	it.each([
		['a bare path with no scheme', '/foo/bar'],
		['a relative string', 'foo/bar'],
	])('rejects a non-absolute destination (%s)', (_label, destination) => {
		const errors = expectErrors(
			validateRedirectRuleDraft({ ...validWildcardDraft, destination }),
		);

		expect(errors.destination).toBeDefined();
	});

	it('rejects a destination containing a $1 capture ref that is still non-absolute once substituted', () => {
		const errors = expectErrors(
			validateRedirectRuleDraft({ ...validWildcardDraft, destination: '/foo/$1' }),
		);

		expect(errors.destination).toBeDefined();
	});

	it('accepts an absolute destination containing $1/$9 capture refs', () => {
		const result = expectOk(
			validateRedirectRuleDraft({
				...validWildcardDraft,
				destination: 'https://localhost:3000/$1/$9',
			}),
		);

		expect(result.destination).toBe('https://localhost:3000/$1/$9');
	});

	it('accepts an absolute destination using the $$ literal-dollar escape, without tripping the absolute-URL check', () => {
		const result = expectOk(
			validateRedirectRuleDraft({
				...validWildcardDraft,
				destination: 'https://localhost:3000/pay?amount=$$100',
			}),
		);

		expect(result.destination).toBe('https://localhost:3000/pay?amount=$$100');
	});

	it('rejects a destination that is purely a capture ref, by design — a $1 ref alone has no literal absolute scheme/host to validate', () => {
		// Intentional restriction (see the comment above the destination validation block):
		// `destination: '$1'` would make sense for a source pattern that captures a whole absolute
		// URL (e.g. `^https://old\.example\.com/go\?to=(https?://.+)$`), but the placeholder
		// substitution has no way to tell that apart from a bare, non-absolute capture ref, so it's
		// rejected either way.
		const errors = expectErrors(
			validateRedirectRuleDraft({ ...validWildcardDraft, destination: '$1' }),
		);

		expect(errors.destination).toBeDefined();
		expect(errors.destination).toMatch(/absolute URL/);
	});

	it('reports every failing field at once, rather than short-circuiting on the first error', () => {
		const errors = expectErrors(
			validateRedirectRuleDraft({
				...validWildcardDraft,
				name: '',
				urlPattern: '',
				destination: '',
			}),
		);

		expect(errors.name).toBeDefined();
		expect(errors.urlPattern).toBeDefined();
		expect(errors.destination).toBeDefined();
		expect(Object.keys(errors)).toHaveLength(3);
	});

	it('passes a non-empty methods array through untouched in the ok result', () => {
		const result = expectOk(
			validateRedirectRuleDraft({ ...validWildcardDraft, methods: ['GET', 'POST'] }),
		);

		expect(result.methods).toEqual(['GET', 'POST']);
	});

	describe('D15 self-match warning (non-blocking)', () => {
		it('warns, but still ok: true, for a wildcard "*" pattern that matches literally everything, including its own destination', () => {
			const result = expectOk(
				validateRedirectRuleDraft({
					...validWildcardDraft,
					urlPattern: '*',
					destination: 'https://localhost:3000/foo',
				}),
			);

			expect(result.warnings.urlPattern).toEqual(expect.any(String));
		});

		it('warns for a wildcard pattern whose literal prefix matches its own capture-ref destination once substituted', () => {
			// urlPattern compiles to `https://prod\.example\.com/(.*)`, which — matched
			// unanchored — matches the destination template itself (after $1 is substituted
			// with a sample placeholder), since the destination shares the pattern's literal
			// prefix. Verified directly against the compiled regex before writing this test.
			const result = expectOk(
				validateRedirectRuleDraft({
					...validWildcardDraft,
					urlPattern: 'https://prod.example.com/*',
					destination: 'https://prod.example.com/$1',
				}),
			);

			expect(result.warnings.urlPattern).toEqual(expect.any(String));
		});

		it('does not warn for a clean, non-looping wildcard pattern with no wildcard character at all', () => {
			const result = expectOk(
				validateRedirectRuleDraft({
					...validWildcardDraft,
					urlPattern: 'https://prod.example.com/api',
					destination: 'https://localhost:3000/api',
				}),
			);

			expect(result.warnings).toEqual({});
			expect(result.warnings.urlPattern).toBeUndefined();
		});

		it('also warns in regex mode, confirming the warning path works for matchType: "regex" too', () => {
			const result = expectOk(
				validateRedirectRuleDraft({
					...validRegexDraft,
					urlPattern: '.*',
					destination: 'https://localhost:3000/foo',
				}),
			);

			expect(result.warnings.urlPattern).toEqual(expect.any(String));
		});
	});
});

describe('toRedirectRuleItem', () => {
	it('converts a valid draft into the full RedirectRuleItem shape', () => {
		const item = toRedirectRuleItem(validWildcardDraft, 'redirect-local-proxy');

		expect(item).toEqual({
			id: 'redirect-local-proxy',
			kind: 'redirect',
			name: 'Local Proxy Redirect',
			enabled: true,
			matchType: 'wildcard',
			urlPattern: 'https://prod.example.com/api/*',
			destination: 'https://localhost:3000/api/$1',
			methods: undefined,
		});
	});

	it('preserves the draft enabled flag as-is (true)', () => {
		const item = toRedirectRuleItem({ ...validWildcardDraft, enabled: true }, 'redirect-1');

		expect(item.enabled).toBe(true);
	});

	it('preserves the draft enabled flag as-is (false)', () => {
		const item = toRedirectRuleItem({ ...validWildcardDraft, enabled: false }, 'redirect-1');

		expect(item.enabled).toBe(false);
	});

	it('omits methods when the draft methods array is empty', () => {
		const item = toRedirectRuleItem({ ...validWildcardDraft, methods: [] }, 'redirect-1');

		expect(item.methods).toBeUndefined();
	});

	it('includes methods when the draft methods array is non-empty', () => {
		const item = toRedirectRuleItem(
			{ ...validWildcardDraft, methods: ['GET', 'POST'] },
			'redirect-1',
		);

		expect(item.methods).toEqual(['GET', 'POST']);
	});

	it('throws when converting an invalid draft', () => {
		const invalidDraft: RedirectRuleDraft = { ...validWildcardDraft, name: '' };

		expect(() => toRedirectRuleItem(invalidDraft, 'redirect-1')).toThrow(
			/Cannot convert an invalid RedirectRuleDraft/,
		);
	});
});
