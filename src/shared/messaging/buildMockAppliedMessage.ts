import { MESSAGE_SOURCE } from './types';
import type { MockAppliedMessage } from './types';

/**
 * Builds the message the interceptor posts each time it serves a mocked response.
 *
 * @returns The `mock-applied` message.
 */
export const buildMockAppliedMessage = (): MockAppliedMessage => ({
	source: MESSAGE_SOURCE,
	type: 'mock-applied',
});
