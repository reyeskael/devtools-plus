import type { HttpRuleItem, MockResponseItem } from '../items/types';

export const MESSAGE_SOURCE = 'devtools-plus' as const;

export interface RuleSnapshot {
	mockResponses: MockResponseItem[];
	httpRules: HttpRuleItem[];
	isRunning: boolean;
}

export interface RulesSnapshotMessage {
	source: typeof MESSAGE_SOURCE;
	type: 'rules-snapshot';
	payload: RuleSnapshot;
}

export interface MockAppliedMessage {
	source: typeof MESSAGE_SOURCE;
	type: 'mock-applied';
}

export interface MockCountPayload {
	count: number;
}

export interface MockCountMessage {
	source: typeof MESSAGE_SOURCE;
	type: 'mock-count';
	payload: MockCountPayload;
}

// Messages exchanged via window.postMessage between the ISOLATED-world bridge
// and the MAIN-world interceptor (in either direction).
export type BridgeMessage = RulesSnapshotMessage | MockAppliedMessage;
