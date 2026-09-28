import type { MockResponseItem, PopupItem } from '../items/types';

export interface MockRequestQuery {
	method: string;
	url: string;
	baseUrl?: string;
}

/**
 * Resolves a possibly-relative request URL against a base URL, for comparing against a
 * mock's `urlPattern`.
 *
 * @param url - The request URL, absolute or relative.
 * @param baseUrl - The page's base URL to resolve a relative `url` against.
 * @returns The resolved absolute URL, or `url` unchanged if it isn't parseable.
 */
const resolveUrl = (url: string, baseUrl?: string): string => {
	try {
		return new URL(url, baseUrl).href;
	} catch {
		return url;
	}
};

/**
 * Finds the first enabled mock response whose method and `urlPattern` (a substring match)
 * match the given request — the matching rule described in the repo's CLAUDE.md.
 *
 * @param items - The popup items to search; non-mock-response and disabled items are skipped.
 * @param query - The request's method, URL, and optional base URL to resolve it against.
 * @returns The first matching mock response item, or `undefined` if none match.
 */
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
