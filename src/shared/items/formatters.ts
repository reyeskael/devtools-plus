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
 * Formats a redirect rule item as a one-line summary for the popup's item rows.
 *
 * @param item - The redirect rule to summarize.
 * @returns A string like `"/old/path → /new/path"`.
 */
export const formatRedirectSummary = (item: RedirectRuleItem): string =>
	`${item.urlPattern} → ${item.destination}`;
