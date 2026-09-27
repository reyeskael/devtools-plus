import { MESSAGE_SOURCE } from './types';
import type { MockCountMessage } from './types';

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
