import { findMatchingMock } from '../../shared/mocks/matchMock';
import type { RuleGate } from './ruleGate';
import type { MockResponseItem } from '../../shared/items/types';

/**
 * Looks up the mock (if any) for a request against the rule gate's current snapshot — the
 * shared decision point used by both the fetch and XHR interceptors.
 *
 * @param ruleGate - Holds the latest rule snapshot posted by the bridge.
 * @param method - The request's HTTP method.
 * @param url - The request's URL, absolute or relative.
 * @param baseUrl - The page's base URL to resolve a relative `url` against.
 * @returns The matching mock response item, or `undefined` when there's no snapshot yet,
 * interception is off, or nothing matches.
 */
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
