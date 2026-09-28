import { MESSAGE_SOURCE } from './types';
import type { MockAppliedMessage } from './types';

/**
 * Type guard validating a `window.postMessage` payload as a `mock-applied` message.
 *
 * @param data - The raw `event.data` from a `message` event.
 * @returns Whether `data` is a well-formed `MockAppliedMessage`.
 */
export const isMockAppliedMessage = (data: unknown): data is MockAppliedMessage => {
	if (typeof data !== 'object' || data === null) {
		return false;
	}
	const message = data as Record<string, unknown>;
	return message.source === MESSAGE_SOURCE && message.type === 'mock-applied';
};
