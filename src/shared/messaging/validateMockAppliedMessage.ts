import { MESSAGE_SOURCE } from './types';
import type { MockAppliedMessage } from './types';

export const isMockAppliedMessage = (data: unknown): data is MockAppliedMessage => {
	if (typeof data !== 'object' || data === null) {
		return false;
	}
	const message = data as Record<string, unknown>;
	return message.source === MESSAGE_SOURCE && message.type === 'mock-applied';
};
