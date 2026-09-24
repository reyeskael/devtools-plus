import { MESSAGE_SOURCE } from './types';
import type { RulesSnapshotMessage } from './types';

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
	const { mockResponses, httpRules, isRunning } = message.payload as Record<string, unknown>;
	return Array.isArray(mockResponses) && Array.isArray(httpRules) && typeof isRunning === 'boolean';
};
