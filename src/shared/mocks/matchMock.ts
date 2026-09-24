import type { MockResponseItem, PopupItem } from '../items/types';

export interface MockRequestQuery {
	method: string;
	url: string;
	baseUrl?: string;
}

const resolveUrl = (url: string, baseUrl?: string): string => {
	try {
		return new URL(url, baseUrl).href;
	} catch {
		return url;
	}
};

export const findMatchingMock = (
	items: PopupItem[],
	{ method, url, baseUrl }: MockRequestQuery,
): MockResponseItem | undefined => {
	const resolvedUrl = resolveUrl(url, baseUrl);

	for (const item of items) {
		if (item.kind !== 'mock-response' || !item.enabled) {
			continue;
		}
		if (item.method.toUpperCase() !== method.toUpperCase()) {
			continue;
		}
		if (resolvedUrl.includes(item.urlPattern)) {
			return item;
		}
	}

	return undefined;
};
