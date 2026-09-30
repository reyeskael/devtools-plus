import { MESSAGE_SOURCE } from './types';
import type { RulesSnapshotMessage } from './types';

/**
 * Type guard validating a `window.postMessage` payload as a `rules-snapshot` message.
 *
 * @param data - The raw `event.data` from a `message` event.
 * @returns Whether `data` is a well-formed `RulesSnapshotMessage`.
 */
export const isRulesSnapshotMessage = (data: unknown): data is RulesSnapshotMessage => {
	if (typeof data !== 'object' || data === null) {
		return false;
	}
	const message = data as Record<string, unknown>;
	if (message.source !== MESSAGE_SOURCE || message.type !== 'rules-snapshot') {
		return false;
	}
	if (typeof message.payload !== 'object' || message.payload === null) {
		return false;
	}
	const { mockResponses, isRunning } = message.payload as Record<string, unknown>;
	return Array.isArray(mockResponses) && typeof isRunning === 'boolean';
};
