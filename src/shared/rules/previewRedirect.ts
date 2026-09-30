import type { RedirectRuleItem } from '../items/types';
import { wildcardToRegex } from './pattern';

export interface RedirectPreviewResult {
	/** Whether the compiled pattern matched `sampleUrl` at all. */
	matched: boolean;
	/** The full resulting URL DNR would redirect to. Only set when `matched` is `true`. */
	result?: string;
}

/**
 * Substitutes `$1`..`$9` capture-group refs in `template` with the corresponding groups from
 * `match`, treating `$$` as an escaped literal `$`. A referenced group that didn't participate in
 * the match (e.g. an optional group) substitutes as an empty string.
 *
 * @param template - The destination template, e.g. `"https://localhost:3000/$1"`.
 * @param match - The `RegExpMatchArray` produced by matching the compiled pattern against a URL.
 * @returns `template` with every `$n` replaced by its capture group and `$$` collapsed to `$`.
 */
const substituteCaptureRefs = (template: string, match: RegExpMatchArray): string =>
	template.replace(/\$(\$|[1-9])/g, (_full, ref: string) =>
		ref === '$' ? '$' : (match[Number(ref)] ?? ''),
	);

/**
 * Previews what a redirect rule would actually do to `sampleUrl`, modeling DNR's **whole-URL
 * replacement** semantics rather than an in-place span/substring replacement. This is the trap
 * the editor's pattern tester exists to expose: DNR's `regexSubstitution` (and `redirect.url`)
 * replace the entire matched URL with the substitution result — they don't splice it into the
 * matched span and leave the rest of the URL alone. A destination that doesn't reference the
 * original query string via a capture group silently drops it.
 *
 * Compiles the pattern the same way `toDnrRules.ts` does (`wildcardToRegex` for `'wildcard'`,
 * used as-is for `'regex'`) and matches it unanchored against `sampleUrl`, since DNR's
 * `urlFilter`/`regexFilter` match as a partial match too — no `^`/`$` are added here.
 *
 * Note: `matchType: 'regex'` patterns are compiled here with native JS `RegExp`, but the real DNR
 * rule enforces the same pattern via Chrome's RE2 engine (no lookahead/lookbehind/backreferences).
 * A pattern that "matches" in this preview could still be rejected by Chrome at install time —
 * RE2-compatibility validation (via `chrome.declarativeNetRequest.isRegexSupported()`) is left to
 * the future editor UI, not reimplemented here.
 *
 * @param item - The redirect rule's pattern/destination fields to preview.
 * @param sampleUrl - A sample request URL to test the pattern against.
 * @returns `{ matched: false }` if the pattern doesn't match `sampleUrl` — or if `item.urlPattern`
 * is not a syntactically valid regex, which is expected mid-edit in a live pattern tester and
 * should not crash — otherwise `{ matched: true, result }` where `result` is the full URL DNR
 * would redirect to.
 */
export const previewRedirect = (
	item: Pick<RedirectRuleItem, 'matchType' | 'urlPattern' | 'destination'>,
	sampleUrl: string,
): RedirectPreviewResult => {
	const source = item.matchType === 'regex' ? item.urlPattern : wildcardToRegex(item.urlPattern);

	let match: RegExpMatchArray | null;
	try {
		// A live pattern tester sees invalid regex mid-edit (e.g. "(unclosed") — that trivially
		// "doesn't match" rather than crashing this otherwise-pure function.
		match = sampleUrl.match(new RegExp(source));
	} catch {
		return { matched: false };
	}
	if (!match) {
		return { matched: false };
	}

	return { matched: true, result: substituteCaptureRefs(item.destination, match) };
};
