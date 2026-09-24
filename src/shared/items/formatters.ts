import type { HttpRuleItem, MockResponseItem } from './types';

export const formatMockResponseSummary = (item: MockResponseItem): string =>
	`${item.method} ${item.urlPattern} → ${item.statusCode}`;

export const formatHttpRuleSummary = (item: HttpRuleItem): string => {
	if (item.target) {
		return `${item.action} ${item.urlPattern} → ${item.target}`;
	}
	return `${item.action} ${item.urlPattern}`;
};
