import { dollarRefsToBackslash, escapeRegExp, hasCaptureRef, wildcardToRegex } from './pattern';

describe('escapeRegExp', () => {
	it('escapes every regex-special character', () => {
		expect(escapeRegExp('.*+?^${}()|[]\\')).toBe(
			'\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
		);
	});

	it('leaves plain alphanumeric text untouched', () => {
		expect(escapeRegExp('abc123')).toBe('abc123');
	});

	it('escapes special characters embedded in otherwise-plain text', () => {
		expect(escapeRegExp('prod.example.com')).toBe('prod\\.example\\.com');
	});

	it('returns an empty string unchanged', () => {
		expect(escapeRegExp('')).toBe('');
	});
});

describe('wildcardToRegex', () => {
	it('turns a single trailing wildcard into a capture group after the escaped literal', () => {
		expect(wildcardToRegex('https://prod.example.com/*')).toBe(
			'https://prod\\.example\\.com/(.*)',
		);
	});

	it('turns every wildcard into its own capture group', () => {
		expect(wildcardToRegex('/api/*/users/*')).toBe('/api/(.*)/users/(.*)');
	});

	it('escapes regex-special characters in the literal segments around a wildcard', () => {
		expect(wildcardToRegex('/api/v1/users?id=*')).toBe('/api/v1/users\\?id=(.*)');
	});

	it('produces a plain escaped literal, with no capture group, when there is no wildcard at all', () => {
		expect(wildcardToRegex('/api/v1/users')).toBe('/api/v1/users');
		expect(wildcardToRegex('/api/v1/users')).not.toContain('(.*)');
	});

	it('treats a bare "*" pattern as two empty literals joined by one capture group', () => {
		expect(wildcardToRegex('*')).toBe('(.*)');
	});

	it('returns an empty string for an empty pattern', () => {
		expect(wildcardToRegex('')).toBe('');
	});

	it('turns consecutive wildcards into adjacent capture groups with an empty literal between', () => {
		expect(wildcardToRegex('/api/**/users')).toBe('/api/(.*)(.*)/users');
	});

	it('escapes regex-special characters like (), [], and + in the literal segments', () => {
		expect(wildcardToRegex('/orders(v2)/items[0]/qty+*')).toBe(
			'/orders\\(v2\\)/items\\[0\\]/qty\\+(.*)',
		);
	});
});

describe('dollarRefsToBackslash', () => {
	it('translates a single capture ref to DNR backslash syntax', () => {
		expect(dollarRefsToBackslash('https://localhost:3000/$1')).toBe(
			'https://localhost:3000/\\1',
		);
	});

	it('translates every ref from $1 to $9', () => {
		expect(dollarRefsToBackslash('$1$2$3$4$5$6$7$8$9')).toBe('\\1\\2\\3\\4\\5\\6\\7\\8\\9');
	});

	it('collapses $$ to a literal $ instead of treating it as a capture ref', () => {
		expect(dollarRefsToBackslash('?amount=$$100')).toBe('?amount=$100');
	});

	it('does not corrupt a literal $ followed by digits once escaped as $$', () => {
		// The classic bug this function fixes: a naive /\$(\d+)/g replacement would mangle
		// "$100" into a backreference. Authors escape the literal $ as "$$" to opt out.
		expect(dollarRefsToBackslash('?amount=$$100&ref=$1')).toBe('?amount=$100&ref=\\1');
	});

	it('leaves a template with no $ refs at all untouched', () => {
		expect(dollarRefsToBackslash('https://localhost:3000/static')).toBe(
			'https://localhost:3000/static',
		);
	});

	it('leaves $0 and other non-1-9 digits untouched, since only $1-$9 are valid capture refs', () => {
		expect(dollarRefsToBackslash('$0')).toBe('$0');
	});

	it('collapses a bare "$$1" to a literal "$1", not a capture ref', () => {
		expect(dollarRefsToBackslash('$$1')).toBe('$1');
	});

	it('treats $10 as capture ref $1 followed by a literal "0", since only $1-$9 are matched', () => {
		// Documents current behavior: the regex greedily consumes "$1" out of "$10" and leaves
		// the trailing "0" as a literal, producing "\10" (backreference 1, then "0") rather than
		// leaving "$10" untouched. There is no two-digit capture-ref syntax to begin with (DNR's
		// regexSubstitution only supports \1-\9), so this is the documented, not corrected, behavior.
		expect(dollarRefsToBackslash('$10')).toBe('\\10');
	});
});

describe('hasCaptureRef', () => {
	it('returns true for a plain $1-$9 ref', () => {
		expect(hasCaptureRef('https://localhost:3000/$1')).toBe(true);
	});

	it('returns false when there is no "$" at all', () => {
		expect(hasCaptureRef('https://localhost:3000/static')).toBe(false);
	});

	it('returns false for a lone "$$" with no adjacent digit', () => {
		expect(hasCaptureRef('?ref=$$order')).toBe(false);
	});

	it('returns false for "$$100", the escaped-literal-$ case a naive /\\$[1-9]/ test misdetects', () => {
		expect(hasCaptureRef('?amount=$$100')).toBe(false);
	});

	it('returns true for a real ref that follows an escape, e.g. "$$abc$1"', () => {
		expect(hasCaptureRef('$$abc$1')).toBe(true);
	});
});
