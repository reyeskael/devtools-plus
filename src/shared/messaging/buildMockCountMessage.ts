import { MESSAGE_SOURCE } from './types';
import type { MockCountMessage } from './types';

/**
 * Builds the message the bridge sends to the background service worker to update the tab's
 * badge count.
 *
 * @param count - The current mock-applied count for the page.
 * @returns The `mock-count` message.
 */
export const buildMockCountMessage = (count: number): MockCountMessage => ({
	source: MESSAGE_SOURCE,
	type: 'mock-count',
	payload: { count },
});
