import { isMockAppliedMessage } from './validateMockAppliedMessage';
import { MESSAGE_SOURCE } from './types';
import type { MockAppliedMessage } from './types';

const validMessage: MockAppliedMessage = {
	source: MESSAGE_SOURCE,
	type: 'mock-applied',
};

describe('isMockAppliedMessage', () => {
	it('accepts a well-formed message', () => {
		expect(isMockAppliedMessage(validMessage)).toBe(true);
	});

	it('rejects undefined', () => {
		expect(isMockAppliedMessage(undefined)).toBe(false);
	});

	it('rejects null', () => {
		expect(isMockAppliedMessage(null)).toBe(false);
	});

	it('rejects a string', () => {
		expect(isMockAppliedMessage('mock-applied')).toBe(false);
	});

	it('rejects a number', () => {
		expect(isMockAppliedMessage(42)).toBe(false);
	});

	it('rejects a message with the wrong source', () => {
		expect(isMockAppliedMessage({ ...validMessage, source: 'some-other-extension' })).toBe(
			false,
		);
	});

	it('rejects a message with the wrong type', () => {
		expect(isMockAppliedMessage({ ...validMessage, type: 'rules-snapshot' })).toBe(false);
	});
});
