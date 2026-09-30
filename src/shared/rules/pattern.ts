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
