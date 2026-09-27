import { MESSAGE_SOURCE } from './types';
import type { MockAppliedMessage } from './types';

export const buildMockAppliedMessage = (): MockAppliedMessage => ({
	source: MESSAGE_SOURCE,
	type: 'mock-applied',
});
