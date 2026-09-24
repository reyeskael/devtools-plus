import { findMatchingMock } from '../../shared/mocks/matchMock';
import type { RuleGate } from './ruleGate';
import type { MockResponseItem } from '../../shared/items/types';

export const resolveMock = (
	ruleGate: RuleGate,
	method: string,
	url: string,
	baseUrl: string,
): MockResponseItem | undefined => {
	const snapshot = ruleGate.getSnapshot();
	if (!snapshot || !snapshot.isRunning) {
		return undefined;
	}
	return findMatchingMock(snapshot.mockResponses, { method, url, baseUrl });
};
