import type { HttpRuleItem, MockResponseItem } from './types';

/**
 * Formats a mock response item as a one-line summary for the popup's item rows.
 *
 * @param item - The mock response to summarize.
 * @returns A string like `"GET /api/users → 200"`.
 */
export const formatMockResponseSummary = (item: MockResponseItem): string =>
	`${item.method} ${item.urlPattern} → ${item.statusCode}`;

/**
 * Formats an HTTP rule item as a one-line summary for the popup's item rows.
 *
 * @param item - The HTTP rule to summarize.
 * @returns A string like `"redirect /old/path → /new/path"`, omitting the arrow when there's
 * no `target`.
 */
export const formatHttpRuleSummary = (item: HttpRuleItem): string => {
	if (item.target) {
		return `${item.action} ${item.urlPattern} → ${item.target}`;
	}
	return `${item.action} ${item.urlPattern}`;
};
