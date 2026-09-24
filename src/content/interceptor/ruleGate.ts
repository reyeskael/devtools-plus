import type { RuleSnapshot } from '../../shared/messaging/types';

export const HOLD_TIMEOUT_MS = 1000;

export interface RuleGate {
	isReady: () => boolean;
	waitUntilReady: () => Promise<void>;
	getSnapshot: () => RuleSnapshot | undefined;
	setSnapshot: (snapshot: RuleSnapshot) => void;
}

export const createRuleGate = (): RuleGate => {
	let snapshot: RuleSnapshot | undefined;
	let ready = false;
	let resolveReady: () => void;

	const rulesReady = new Promise<void>((resolve) => {
		resolveReady = resolve;
	});

	const timeoutId = setTimeout(() => {
		if (!ready) {
			console.warn(
				'[devtools-plus] no rule snapshot received within 1s; releasing held requests to the real network',
			);
			ready = true;
			resolveReady();
		}
	}, HOLD_TIMEOUT_MS);

	return {
		isReady: () => ready,
		waitUntilReady: () => rulesReady,
		getSnapshot: () => snapshot,
		setSnapshot: (next) => {
			snapshot = next;
			if (!ready) {
				ready = true;
				clearTimeout(timeoutId);
				resolveReady();
			}
		},
	};
};
