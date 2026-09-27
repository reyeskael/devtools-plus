import { MESSAGE_SOURCE } from './types';
import type { MockCountMessage } from './types';

export const buildMockCountMessage = (count: number): MockCountMessage => ({
	source: MESSAGE_SOURCE,
	type: 'mock-count',
	payload: { count },
});
