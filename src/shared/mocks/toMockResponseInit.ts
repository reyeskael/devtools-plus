import type { MockResponseItem } from '../items/types';

export interface MockResponseInit {
	status: number;
	statusText: string;
	body: string;
}

/**
 * Converts a mock response item into the plain status/body fields needed to construct an
 * actual `Response` (or its XHR-shadowed equivalent).
 *
 * @param item - The mock response item to convert.
 * @returns The status code, status text (empty string if unset), and JSON-stringified body
 * (empty string if `body` is `undefined`).
 */
export const toMockResponseInit = (item: MockResponseItem): MockResponseInit => ({
	status: item.statusCode,
	statusText: item.statusText ?? '',
	body: item.body === undefined ? '' : (JSON.stringify(item.body) ?? ''),
});
