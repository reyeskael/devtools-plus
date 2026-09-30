import type { HttpMethod, PopupItem, RedirectRuleItem } from '../items/types';
import { dollarRefsToBackslash, hasCaptureRef, wildcardToRegex } from './pattern';

/**
 * Resource types a redirect rule applies to, set explicitly rather than relying on DNR's
 * undocumented default. Deliberately excludes `main_frame` — a redirect rule should never
 * hijack a page navigation. See `REDIRECT-REQUEST/plan/plan.md` (D10).
 */
const REDIRECT_RESOURCE_TYPES: chrome.declarativeNetRequest.RuleCondition['resourceTypes'] = [
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
];

/**
 * Derives a stable, positive 31-bit integer rule id from an item's string `id`, via FNV-1a — a
 * small, fast, well-known string hash. DNR rule ids must be positive integers (`>= 1`), and
 * deriving the id from the item's own id (rather than a re-allocated sequential counter) means a
 * future diff-based update can recognize "this is still the same rule" across syncs.
 *
 * @param id - The `PopupItem`'s string id.
 * @returns A positive integer in `[1, 0x7fffffff]`.
 */
const hashToRuleId = (id: string): number => {
	let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
	for (let i = 0; i < id.length; i++) {
		hash ^= id.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193); // FNV-1a 32-bit prime
	}
	return Math.abs(hash) % 0x7fffffff || 1;
};

/**
 * Compiles one `RedirectRuleItem`'s condition (pattern) into DNR's `urlFilter`/`regexFilter`
 * split. Wildcard-free patterns use `urlFilter` — a cheap substring match with no RE2 risk.
 * Needs `regexFilter` instead when any of:
 *  - `matchType === 'regex'` (author-supplied regex)
 *  - `urlPattern` contains `*` (wildcard match)
 *  - `urlPattern` contains a literal `^` — `urlFilter` has no escape for it, since DNR treats `^`
 *    as a "separator" wildcard everywhere it appears in a `urlFilter` string (see DNR's
 *    `urlFilter` syntax docs), so it must go through `regexFilter` instead, where
 *    `wildcardToRegex` can escape it properly.
 *  - `destination` contains a `$1`-`$9` capture ref. This is a coupling with `toRedirectAction`:
 *    a capture ref in the destination means the action must use `regexSubstitution`, and DNR
 *    requires `regexSubstitution` to be paired with a `regexFilter` condition, never `urlFilter`
 *    — without this check, a literal pattern combined with a `$1` destination would compile to an
 *    invalid `urlFilter`/`regexSubstitution` rule that `updateDynamicRules()` rejects. When this
 *    is the only reason regex is needed, `wildcardToRegex` on a wildcard-free pattern still
 *    produces a correct, fully-escaped-literal regex source (no capture groups), so `regexFilter`
 *    remains a safe (if no longer the cheapest) choice.
 *
 * @param item - The redirect rule whose pattern (and destination, for the coupling above) to compile.
 * @returns The `urlFilter`/`regexFilter` half of a DNR `RuleCondition`.
 */
const toPatternCondition = (
	item: RedirectRuleItem,
): Pick<chrome.declarativeNetRequest.RuleCondition, 'urlFilter' | 'regexFilter'> => {
	const needsRegex =
		item.matchType === 'regex' ||
		item.urlPattern.includes('*') ||
		item.urlPattern.includes('^') ||
		hasCaptureRef(item.destination);
	if (!needsRegex) {
		return { urlFilter: item.urlPattern };
	}
	const regexFilter =
		item.matchType === 'regex' ? item.urlPattern : wildcardToRegex(item.urlPattern);
	return { regexFilter };
};

/**
 * Compiles one `RedirectRuleItem`'s destination into DNR's `redirect.url`/`redirect.regexSubstitution`
 * split. A destination with no `$1`..`$9` capture ref is a static URL; `dollarRefsToBackslash` still
 * runs over it to collapse a `$$` escape into a literal `$`. A destination that does reference capture
 * groups requires `regexSubstitution` — `toPatternCondition` checks this same `hasCaptureRef` condition
 * so that whenever this returns `regexSubstitution`, the paired condition is always `regexFilter`.
 *
 * @param destination - The redirect rule's `destination` template.
 * @returns The `redirect` half of a DNR `RuleAction`.
 */
const toRedirectAction = (destination: string): chrome.declarativeNetRequest.Redirect => {
	const substituted = dollarRefsToBackslash(destination);
	return hasCaptureRef(destination) ? { regexSubstitution: substituted } : { url: substituted };
};

/**
 * Compiles a single enabled `RedirectRuleItem` into a DNR rule.
 *
 * @param item - The redirect rule to compile.
 * @param priority - This rule's DNR priority (higher wins on conflict).
 * @returns One `chrome.declarativeNetRequest.Rule`.
 */
const toDnrRule = (item: RedirectRuleItem, priority: number): chrome.declarativeNetRequest.Rule => {
	const condition: chrome.declarativeNetRequest.RuleCondition = {
		...toPatternCondition(item),
		resourceTypes: REDIRECT_RESOURCE_TYPES,
	};
	if (item.methods && item.methods.length > 0) {
		condition.requestMethods = item.methods.map(
			(method: HttpMethod) => method.toLowerCase() as Lowercase<HttpMethod>,
		);
	}

	return {
		id: hashToRuleId(item.id),
		priority,
		action: { type: 'redirect', redirect: toRedirectAction(item.destination) },
		condition,
	};
};

/**
 * Compiles the popup's items into the DNR rule set the background worker should install. Pure
 * and chrome-API-free — it only builds plain `Rule` objects, so it's fully unit-testable without
 * a real extension context. See `REDIRECT-REQUEST/plan/plan.md` for the "Mechanism detail"
 * section this implements.
 *
 * @param items - All popup items (mocks and redirects); non-redirect and disabled items are
 * ignored.
 * @param isRunning - The master toggle. `false` means "enforce nothing" — an empty array is
 * returned immediately, before any items are inspected.
 * @returns One DNR rule per enabled `RedirectRuleItem`, in the same order as `items`. Each rule's
 * `priority` is derived from its position in `items` (top of the list = highest priority number =
 * highest precedence), and its `id` is a deterministic hash of the item's own `id`.
 */
export const toDnrRules = (
	items: PopupItem[],
	isRunning: boolean,
): chrome.declarativeNetRequest.Rule[] => {
	if (!isRunning) {
		return [];
	}

	const rules: chrome.declarativeNetRequest.Rule[] = [];
	for (const [index, item] of items.entries()) {
		if (item.kind !== 'redirect' || !item.enabled) {
			continue;
		}
		// First item in the list gets the highest priority number (highest precedence); later
		// items get progressively lower values. DNR priorities must be >= 1.
		rules.push(toDnrRule(item, items.length - index));
	}
	return rules;
};
