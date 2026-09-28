import type { HttpRuleItem, MockResponseItem } from '../items/types';

/** Tags every message in this system so validators can reject anything else on the page. */
export const MESSAGE_SOURCE = 'devtools-plus' as const;

/** The popup's full mock/rule state, as posted from the bridge to the interceptor. */
export interface RuleSnapshot {
	mockResponses: MockResponseItem[];
	httpRules: HttpRuleItem[];
	isRunning: boolean;
}

/** Posted by the bridge into the page whenever the stored rules change. */
export interface RulesSnapshotMessage {
	source: typeof MESSAGE_SOURCE;
	type: 'rules-snapshot';
	payload: RuleSnapshot;
}

/** Posted by the interceptor into the page each time it serves a mocked response. */
export interface MockAppliedMessage {
	source: typeof MESSAGE_SOURCE;
	type: 'mock-applied';
}

export interface MockCountPayload {
	count: number;
}

/** Sent by the bridge to the background service worker to update the tab's badge count. */
export interface MockCountMessage {
	source: typeof MESSAGE_SOURCE;
	type: 'mock-count';
	payload: MockCountPayload;
}

/**
 * Messages exchanged via window.postMessage between the ISOLATED-world bridge and the
 * MAIN-world interceptor (in either direction).
 */
export type BridgeMessage = RulesSnapshotMessage | MockAppliedMessage;
