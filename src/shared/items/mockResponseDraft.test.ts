import { toMockResponseItem, validateMockResponseDraft } from './mockResponseDraft';
import type { MockResponseDraft, ValidateMockResponseDraftResult } from './mockResponseDraft';

const validDraft: MockResponseDraft = {
	name: 'User Profile - 200',
	method: 'GET',
	urlPattern: '/api/v1/users/me',
	statusCode: '200',
	statusText: 'OK',
	body: '{"id":"user-1"}',
	enabled: true,
};

const expectOk = (
	result: ValidateMockResponseDraftResult,
): Extract<ValidateMockResponseDraftResult, { ok: true }> => {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected validateMockResponseDraft to succeed');
	}
	return result;
};

const expectErrors = (
	result: ValidateMockResponseDraftResult,
): Extract<ValidateMockResponseDraftResult, { ok: false }>['errors'] => {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected validateMockResponseDraft to fail');
	}
	return result.errors;
};

describe('validateMockResponseDraft', () => {
	it('accepts a fully valid draft, returning correctly parsed/typed fields', () => {
		const result = expectOk(validateMockResponseDraft(validDraft));

		expect(result.name).toBe('User Profile - 200');
		expect(result.method).toBe('GET');
		expect(result.urlPattern).toBe('/api/v1/users/me');
		expect(result.statusCode).toBe(200);
		expect(typeof result.statusCode).toBe('number');
		expect(result.statusText).toBe('OK');
		expect(result.body).toEqual({ id: 'user-1' });
	});

	it('omits statusText when the draft statusText is empty', () => {
		const result = expectOk(validateMockResponseDraft({ ...validDraft, statusText: '  ' }));

		expect(result.statusText).toBeUndefined();
	});

	it.each([
		['empty string', ''],
		['whitespace only', '   '],
	])('rejects a name that is %s (after trim)', (_label, name) => {
		const errors = expectErrors(validateMockResponseDraft({ ...validDraft, name }));

		expect(errors.name).toBeDefined();
	});

	it('rejects an empty urlPattern', () => {
		const errors = expectErrors(validateMockResponseDraft({ ...validDraft, urlPattern: '' }));

		expect(errors.urlPattern).toBeDefined();
	});

	it.each(['abc', '12.5'])('rejects a non-integer statusCode (%s)', (statusCode) => {
		const errors = expectErrors(validateMockResponseDraft({ ...validDraft, statusCode }));

		expect(errors.statusCode).toBeDefined();
	});

	it.each(['0', '600', '99', '-1'])('rejects an out-of-range statusCode (%s)', (statusCode) => {
		const errors = expectErrors(validateMockResponseDraft({ ...validDraft, statusCode }));

		expect(errors.statusCode).toBeDefined();
	});

	it('rejects an empty statusCode', () => {
		const errors = expectErrors(validateMockResponseDraft({ ...validDraft, statusCode: '' }));

		expect(errors.statusCode).toBeDefined();
	});

	it('rejects unparseable JSON in the body field', () => {
		const errors = expectErrors(validateMockResponseDraft({ ...validDraft, body: '{not json' }));

		expect(errors.body).toBeDefined();
	});

	it('accepts an empty body string as "no body", not a validation error', () => {
		const result = expectOk(validateMockResponseDraft({ ...validDraft, body: '' }));

		expect(result.body).toBeUndefined();
	});

	it('omits body in the ok result for a null-body status (204) even when body text is present', () => {
		const result = expectOk(
			validateMockResponseDraft({
				...validDraft,
				statusCode: '204',
				body: '{"leaked":"no"}',
			}),
		);

		expect(result.body).toBeUndefined();
	});

	it('omits body in the ok result for a null-body status (205) even when body text is present', () => {
		const result = expectOk(
			validateMockResponseDraft({
				...validDraft,
				statusCode: '205',
				body: '{"leaked":"no"}',
			}),
		);

		expect(result.body).toBeUndefined();
	});

	it('omits body in the ok result for a null-body status (304) even when body text is present', () => {
		const result = expectOk(
			validateMockResponseDraft({
				...validDraft,
				statusCode: '304',
				body: '{"leaked":"no"}',
			}),
		);

		expect(result.body).toBeUndefined();
	});

	it('reports every failing field at once, rather than short-circuiting on the first error', () => {
		const errors = expectErrors(
			validateMockResponseDraft({
				...validDraft,
				name: '',
				urlPattern: '',
				statusCode: 'not-a-number',
				body: '{not json',
			}),
		);

		expect(errors.name).toBeDefined();
		expect(errors.urlPattern).toBeDefined();
		expect(errors.statusCode).toBeDefined();
		expect(errors.body).toBeDefined();
		expect(Object.keys(errors)).toHaveLength(4);
	});
});

describe('toMockResponseItem', () => {
	it('converts a valid draft into the full MockResponseItem shape', () => {
		const item = toMockResponseItem(validDraft, 'mock-user-profile-200');

		expect(item).toEqual({
			id: 'mock-user-profile-200',
			kind: 'mock-response',
			name: 'User Profile - 200',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/v1/users/me',
			statusCode: 200,
			statusText: 'OK',
			body: { id: 'user-1' },
		});
	});

	it('preserves the draft enabled flag as-is', () => {
		const item = toMockResponseItem({ ...validDraft, enabled: false }, 'mock-1');

		expect(item.enabled).toBe(false);
	});

	it('throws when converting an invalid draft', () => {
		const invalidDraft: MockResponseDraft = { ...validDraft, name: '' };

		expect(() => toMockResponseItem(invalidDraft, 'mock-1')).toThrow(
			/Cannot convert an invalid MockResponseDraft/,
		);
	});
});
