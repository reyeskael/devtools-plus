import { createRuleGate, HOLD_TIMEOUT_MS } from './ruleGate';
import type { RuleSnapshot } from '../../shared/messaging/types';

const snapshotA: RuleSnapshot = {
	mockResponses: [],
	httpRules: [],
	isRunning: true,
};

const snapshotB: RuleSnapshot = {
	mockResponses: [],
	httpRules: [],
	isRunning: false,
};

describe('createRuleGate', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('starts not ready, with no snapshot, and a pending waitUntilReady', async () => {
		const ruleGate = createRuleGate();

		expect(ruleGate.isReady()).toBe(false);
		expect(ruleGate.getSnapshot()).toBeUndefined();

		let settled = false;
		ruleGate.waitUntilReady().then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);
	});

	it('becomes ready and resolves waitUntilReady the first time setSnapshot is called', async () => {
		const ruleGate = createRuleGate();

		ruleGate.setSnapshot(snapshotA);

		expect(ruleGate.isReady()).toBe(true);
		expect(ruleGate.getSnapshot()).toBe(snapshotA);
		await expect(ruleGate.waitUntilReady()).resolves.toBeUndefined();
	});

	it('treats a later setSnapshot call (after an earlier snapshot already made the gate ready) as a plain swap', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const ruleGate = createRuleGate();

		ruleGate.setSnapshot(snapshotA);
		expect(ruleGate.isReady()).toBe(true);

		ruleGate.setSnapshot(snapshotB);

		expect(ruleGate.getSnapshot()).toBe(snapshotB);
		expect(ruleGate.isReady()).toBe(true);
		expect(warnSpy).not.toHaveBeenCalled();
		// waitUntilReady must still resolve exactly once, with no crash from a
		// second resolveReady() call.
		await expect(ruleGate.waitUntilReady()).resolves.toBeUndefined();

		warnSpy.mockRestore();
	});

	it('treats a setSnapshot call after the gate became ready via timeout as a plain swap, with no repeat warning', async () => {
		jest.useFakeTimers();
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const ruleGate = createRuleGate();

		jest.advanceTimersByTime(HOLD_TIMEOUT_MS);
		expect(ruleGate.isReady()).toBe(true);
		expect(warnSpy).toHaveBeenCalledTimes(1);

		ruleGate.setSnapshot(snapshotA);

		expect(ruleGate.getSnapshot()).toBe(snapshotA);
		expect(ruleGate.isReady()).toBe(true);
		expect(warnSpy).toHaveBeenCalledTimes(1);

		warnSpy.mockRestore();
	});

	it('clears the internal timeout when a snapshot arrives before it fires, so the timeout warning never runs', () => {
		jest.useFakeTimers();
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const ruleGate = createRuleGate();

		ruleGate.setSnapshot(snapshotA);
		jest.advanceTimersByTime(HOLD_TIMEOUT_MS);

		expect(warnSpy).not.toHaveBeenCalled();
		expect(ruleGate.getSnapshot()).toBe(snapshotA);

		warnSpy.mockRestore();
	});

	it('becomes ready via the timeout and releases waitUntilReady when no snapshot arrives in time', async () => {
		jest.useFakeTimers();
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const ruleGate = createRuleGate();

		let settled = false;
		const waiting = ruleGate.waitUntilReady().then(() => {
			settled = true;
		});

		jest.advanceTimersByTime(HOLD_TIMEOUT_MS);
		await waiting;

		expect(settled).toBe(true);
		expect(ruleGate.isReady()).toBe(true);
		expect(ruleGate.getSnapshot()).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledTimes(1);

		warnSpy.mockRestore();
	});
});
