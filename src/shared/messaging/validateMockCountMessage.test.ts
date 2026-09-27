import { isMockCountMessage } from './validateMockCountMessage';
import { MESSAGE_SOURCE } from './types';
import type { MockCountMessage } from './types';

const validMessage: MockCountMessage = {
	source: MESSAGE_SOURCE,
	type: 'mock-count',
	payload: { count: 3 },
};

describe('isMockCountMessage', () => {
	it('accepts a well-formed message', () => {
		expect(isMockCountMessage(validMessage)).toBe(true);
	});

	it('accepts a well-formed message with a count of zero', () => {
		expect(isMockCountMessage({ ...validMessage, payload: { count: 0 } })).toBe(true);
	});

	it('rejects undefined', () => {
		expect(isMockCountMessage(undefined)).toBe(false);
	});

	it('rejects null', () => {
		expect(isMockCountMessage(null)).toBe(false);
	});

	it('rejects a string', () => {
		expect(isMockCountMessage('mock-count')).toBe(false);
	});

	it('rejects a number', () => {
		expect(isMockCountMessage(42)).toBe(false);
	});

	it('rejects a message with the wrong source', () => {
		expect(isMockCountMessage({ ...validMessage, source: 'some-other-extension' })).toBe(false);
	});

	it('rejects a message with the wrong type', () => {
		expect(isMockCountMessage({ ...validMessage, type: 'rules-snapshot' })).toBe(false);
	});

	it('rejects a message with a missing payload', () => {
		expect(isMockCountMessage({ source: MESSAGE_SOURCE, type: 'mock-count' })).toBe(false);
	});

	it('rejects a message where payload is not an object', () => {
		expect(isMockCountMessage({ ...validMessage, payload: 'not-an-object' })).toBe(false);
	});

	it('rejects a message where payload is null', () => {
		expect(isMockCountMessage({ ...validMessage, payload: null })).toBe(false);
	});

	it('rejects a message where count is not a number', () => {
		expect(isMockCountMessage({ ...validMessage, payload: { count: '3' } })).toBe(false);
	});

	it('rejects a message with a missing count', () => {
		expect(isMockCountMessage({ ...validMessage, payload: {} })).toBe(false);
	});
});
