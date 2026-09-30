/**
 * Shared, chrome-API-free pattern utilities for redirect rules. Used by the (future) DNR rule
 * compiler and the (future) UI pattern tester, so both agree on the same semantics — see
 * `REDIRECT-REQUEST/plan/plan.md`.
 */

/**
 * Escapes every regex-special character in `str` so it can be embedded in a `RegExp` and matched
 * literally.
 *
 * @param str - The literal text to escape.
 * @returns `str` with `. * + ? ^ $ { } ( ) | [ ] \` escaped.
 */
export const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Compiles a wildcard pattern (`*` matching anything) into an equivalent regex source string.
 * Splits `pattern` on `*`, escapes each literal segment so it matches literally, and rejoins
 * with `(.*)` — so every wildcard becomes a capture group a destination template can reference
 * via `$1`..`$9`.
 *
 * @param pattern - The wildcard pattern, e.g. `"https://prod.example.com/*"`.
 * @returns Regex source (not a compiled `RegExp`) equivalent to the wildcard pattern.
 */
export const wildcardToRegex = (pattern: string): string =>
	pattern.split('*').map(escapeRegExp).join('(.*)');

/**
 * Translates a destination template's `$1`..`$9` capture-group references into DNR's
 * `regexSubstitution` backslash syntax (`\1`..`\9`). `$$` escapes a literal `$`, so a
 * destination like `?amount=$100` isn't corrupted by a naive `/\$(\d+)/g` replacement.
 *
 * @param template - The destination template, e.g. `"https://localhost:3000/$1"`.
 * @returns The template with `$1`..`$9` translated to `\1`..`\9` and `$$` collapsed to a
 * literal `$`.
 */
export const dollarRefsToBackslash = (template: string): string =>
	template.replace(/\$(\$|[1-9])/g, (_match, ref: string) => (ref === '$' ? '$' : `\\${ref}`));

/**
 * Reports whether `template` references a `$1`..`$9` capture group, the same escape-aware way
 * `dollarRefsToBackslash` parses it: `$$` is consumed as one atomic unit meaning "literal $" and
 * never counts as (or contributes a digit to) a capture ref. Shared by the DNR rule compiler and
 * the redirect preview module so both agree on what counts as "this destination references a
 * capture group" — a naive `/\$[1-9]/` test is wrong here, since it treats the second `$` of an
 * escaped `$$` as if it could start a ref: `"https://x.com/pay?amount=$$100"` is meant as the
 * literal `$100` (no capture ref), but `/\$[1-9]/` matches the `$` from `$$` followed by the `1`
 * of `100` and wrongly reports a ref.
 *
 * @param template - The destination template, e.g. `"https://localhost:3000/$1"`.
 * @returns `true` if `template` contains a real, non-escaped `$1`..`$9` reference.
 */
export const hasCaptureRef = (template: string): boolean => {
	for (const match of template.matchAll(/\$(\$|[1-9])/g)) {
		if (match[1] !== '$') {
			return true;
		}
	}
	return false;
};
