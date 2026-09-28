import { MESSAGE_SOURCE } from './types';
import type { MockCountMessage } from './types';

/**
 * Type guard validating a `chrome.runtime` message as a `mock-count` message.
 *
 * @param data - The raw message received by the background service worker.
 * @returns Whether `data` is a well-formed `MockCountMessage`.
 */
export const isMockCountMessage = (data: unknown): data is MockCountMessage => {
	if (typeof data !== 'object' || data === null) {
		return false;
	}
	const message = data as Record<string, unknown>;
	if (message.source !== MESSAGE_SOURCE || message.type !== 'mock-count') {
		return false;
	}
	if (typeof message.payload !== 'object' || message.payload === null) {
		return false;
	}
	const { count } = message.payload as Record<string, unknown>;
	return typeof count === 'number';
};
