import { previewRedirect } from '../rules/previewRedirect';
import type { HttpMethod, RedirectMatchType, RedirectRuleItem } from './types';

/** The all-string form-state shape a redirect rule editor form holds while a user is typing. */
export interface RedirectRuleDraft {
	name: string;
	matchType: RedirectMatchType;
	urlPattern: string;
	destination: string;
	/** Empty array means "all methods", matching `RedirectRuleItem.methods`'s optional-field convention. */
	methods: HttpMethod[];
	enabled: boolean;
}

/** Result of {@link validateRedirectRuleDraft}: the parsed fields (plus warnings), or one error per bad field. */
export type ValidateRedirectRuleDraftResult =
	| {
			ok: true;
			name: string;
			matchType: RedirectMatchType;
			urlPattern: string;
			destination: string;
			methods?: HttpMethod[];
			warnings: Partial<Record<keyof RedirectRuleDraft, string>>;
	  }
	| { ok: false; errors: Partial<Record<keyof RedirectRuleDraft, string>> };

/**
 * Substitutes every `$1`..`$9` capture-group ref in `template` with `placeholder`, collapsing
 * `$$` to a literal `$` — the same escape convention as `dollarRefsToBackslash`/`previewRedirect`'s
 * capture substitution, used here to turn a destination template into a concrete, checkable URL.
 *
 * @param template - The destination template, e.g. `"https://localhost:3000/$1"`.
 * @param placeholder - The string to substitute for each `$1`..`$9` ref.
 * @returns `template` with every `$n` replaced by `placeholder` and `$$` collapsed to `$`.
 */
const substitutePlaceholders = (template: string, placeholder: string): string =>
	template.replace(/\$(\$|[1-9])/g, (_match, ref: string) => (ref === '$' ? '$' : placeholder));

/**
 * Checks whether a redirect rule's own pattern would match its own destination, the loop risk
 * flagged in D15 — an unanchored wildcard/regex pattern can match the very URL it redirects to,
 * looping until `ERR_TOO_MANY_REDIRECTS`. Only meaningful once `urlPattern` and `destination` have
 * both already passed validation.
 *
 * @param matchType - How `urlPattern` is interpreted.
 * @param urlPattern - The rule's match pattern.
 * @param destination - The rule's destination template.
 * @returns `true` if the pattern matches a sample destination built from the template.
 */
const matchesOwnDestination = (
	matchType: RedirectMatchType,
	urlPattern: string,
	destination: string,
): boolean => {
	const sampleDestination = substitutePlaceholders(destination, 'sample');
	return previewRedirect({ matchType, urlPattern, destination }, sampleDestination).matched;
};

/**
 * Validates a redirect rule editor form's draft state, parsing its string fields into the types
 * `RedirectRuleItem` needs.
 *
 * @param draft - The form's current, all-string field values.
 * @returns `{ ok: true, ... }` with the parsed fields and any non-blocking warnings on success, or
 * `{ ok: false, errors }` with every field that failed validation, keyed by field name.
 */
export const validateRedirectRuleDraft = (
	draft: RedirectRuleDraft,
): ValidateRedirectRuleDraftResult => {
	const errors: Partial<Record<keyof RedirectRuleDraft, string>> = {};

	const name = draft.name.trim();
	if (name.length === 0) {
		errors.name = 'Name is required';
	}

	const urlPattern = draft.urlPattern.trim();
	if (urlPattern.length === 0) {
		errors.urlPattern = 'URL pattern must be a non-empty string';
	} else if (draft.matchType === 'regex') {
		try {
			new RegExp(urlPattern);
		} catch {
			errors.urlPattern = 'Pattern must be a valid regular expression';
		}
	}

	const destination = draft.destination.trim();
	if (destination.length === 0) {
		errors.destination = 'Destination is required';
	} else {
		// Substituting a non-URL-shaped placeholder ('x') means a destination that's purely a
		// capture ref (e.g. destination: "$1") is rejected here by design, even though a source
		// pattern like `^https://old\.example\.com/go\?to=(https?://.+)$` guarantees that capture
		// is itself absolute. Making the placeholder URL-shaped instead (e.g.
		// 'https://example.com/x') would let that case pass, but would also wrongly pass genuinely
		// non-absolute destinations like "foo-$1" (a literal prefix glued to a ref, no real
		// scheme/host). So a redirect destination must spell out a literal absolute scheme/host in
		// the template itself — a capture ref can only ever be part of it, never the whole thing.
		try {
			new URL(substitutePlaceholders(destination, 'x'));
		} catch {
			errors.destination =
				'Destination must be an absolute URL — a capture ref like $1 must be part of a literal absolute URL (e.g. https://example.com/$1), not the entire destination';
		}
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	const warnings: Partial<Record<keyof RedirectRuleDraft, string>> = {};
	if (matchesOwnDestination(draft.matchType, urlPattern, destination)) {
		warnings.urlPattern =
			'This pattern matches its own destination, which can cause a redirect loop (ERR_TOO_MANY_REDIRECTS).';
	}

	return {
		ok: true,
		name,
		matchType: draft.matchType,
		urlPattern,
		destination,
		methods: draft.methods.length > 0 ? draft.methods : undefined,
		warnings,
	};
};

/**
 * Converts a validated redirect rule draft into the full item the popup's item list needs.
 *
 * @param draft - The form's draft state; must already pass {@link validateRedirectRuleDraft}.
 * @param id - The id to assign the new item.
 * @returns The full `RedirectRuleItem`.
 * @throws If `draft` fails validation — callers should validate before converting.
 */
export const toRedirectRuleItem = (draft: RedirectRuleDraft, id: string): RedirectRuleItem => {
	const result = validateRedirectRuleDraft(draft);
	if (!result.ok) {
		throw new Error('Cannot convert an invalid RedirectRuleDraft to a RedirectRuleItem');
	}

	return {
		id,
		kind: 'redirect',
		name: result.name,
		enabled: draft.enabled,
		matchType: result.matchType,
		urlPattern: result.urlPattern,
		destination: result.destination,
		methods: result.methods,
	};
};
