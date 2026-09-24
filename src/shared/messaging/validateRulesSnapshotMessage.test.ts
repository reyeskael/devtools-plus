import { isRulesSnapshotMessage } from './validateRulesSnapshotMessage';
import { MESSAGE_SOURCE } from './types';
import type { RulesSnapshotMessage } from './types';

const validMessage: RulesSnapshotMessage = {
	source: MESSAGE_SOURCE,
	type: 'rules-snapshot',
	payload: {
		mockResponses: [],
		httpRules: [],
		isRunning: true,
	},
};

describe('isRulesSnapshotMessage', () => {
	it('accepts a well-formed message', () => {
		expect(isRulesSnapshotMessage(validMessage)).toBe(true);
	});

	it('rejects undefined', () => {
		expect(isRulesSnapshotMessage(undefined)).toBe(false);
	});

	it('rejects null', () => {
		expect(isRulesSnapshotMessage(null)).toBe(false);
	});

	it('rejects a string', () => {
		expect(isRulesSnapshotMessage('rules-snapshot')).toBe(false);
	});

	it('rejects a number', () => {
		expect(isRulesSnapshotMessage(42)).toBe(false);
	});

	it('rejects a message with the wrong source', () => {
		expect(isRulesSnapshotMessage({ ...validMessage, source: 'some-other-extension' })).toBe(
			false,
		);
	});

	it('rejects a message with the wrong type', () => {
		expect(isRulesSnapshotMessage({ ...validMessage, type: 'mock-applied' })).toBe(false);
	});

	it('rejects a message with a missing payload', () => {
		expect(isRulesSnapshotMessage({ source: MESSAGE_SOURCE, type: 'rules-snapshot' })).toBe(false);
	});

	it('rejects a message where mockResponses is not an array', () => {
		expect(
			isRulesSnapshotMessage({
				...validMessage,
				payload: { ...validMessage.payload, mockResponses: 'not-an-array' },
			}),
		).toBe(false);
	});

	it('rejects a message where httpRules is not an array', () => {
		expect(
			isRulesSnapshotMessage({
				...validMessage,
				payload: { ...validMessage.payload, httpRules: 'not-an-array' },
			}),
		).toBe(false);
	});

	it('rejects a message where isRunning is not a boolean', () => {
		expect(
			isRulesSnapshotMessage({
				...validMessage,
				payload: { ...validMessage.payload, isRunning: 'true' },
			}),
		).toBe(false);
	});

	it('accepts arrays containing non-item garbage, since validation is shape-shallow by design (array-ness only, not per-item)', () => {
		expect(
			isRulesSnapshotMessage({
				...validMessage,
				payload: { ...validMessage.payload, mockResponses: [123], httpRules: ['not-an-item'] },
			}),
		).toBe(true);
	});
});
