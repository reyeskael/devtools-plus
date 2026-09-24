import type { HttpRuleItem, MockResponseItem } from './types';

export function formatMockResponseSummary(item: MockResponseItem): string {
	return `${item.method} ${item.urlPattern} → ${item.statusCode}`;
}

export function formatHttpRuleSummary(item: HttpRuleItem): string {
	if (item.target) {
		return `${item.action} ${item.urlPattern} → ${item.target}`;
	}
	return `${item.action} ${item.urlPattern}`;
}
