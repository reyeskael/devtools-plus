import type { MockResponseItem, RedirectRuleItem } from './types';

/**
 * Formats a mock response item as a one-line summary for the popup's item rows.
 *
 * @param item - The mock response to summarize.
 * @returns A string like `"GET /api/users → 200"`.
 */
export const formatMockResponseSummary = (item: MockResponseItem): string =>
	`${item.method} ${item.urlPattern} → ${item.statusCode}`;

/**
 * Formats a redirect rule item as a one-line summary for the popup's item rows, surfacing its
 * method scoping.
 *
 * @param item - The redirect rule to summarize.
 * @returns A string like `"GET,POST *.js → https://localhost:3000/$1"` when `methods` is a
 * non-empty scoped list, or `"ALL /old/path → /new/path"` when `methods` is omitted/empty
 * (meaning "all methods").
 */
export const formatRedirectSummary = (item: RedirectRuleItem): string => {
	const methodsLabel = item.methods && item.methods.length > 0 ? item.methods.join(',') : 'ALL';
	return `${methodsLabel} ${item.urlPattern} → ${item.destination}`;
};
