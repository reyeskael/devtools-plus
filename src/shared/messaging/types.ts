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

// Union of one member today; T-04/T-05 add more message kinds (e.g. mock-applied
// counts) without breaking this type. Keep it a union, not a single interface.
export type BridgeMessage = RulesSnapshotMessage;
