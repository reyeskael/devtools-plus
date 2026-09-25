import { parseImportedItems, toExportPayload } from './transfer';
import type { HttpRuleItem, MockResponseItem, PopupItem } from './types';
import sampleMockResponses from './__fixtures__/sample-mock-responses.json';

const validMockResponse: MockResponseItem = {
	id: 'mock-1',
	name: 'Mock One',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/a',
	statusCode: 200,
	statusText: 'OK',
};

const validHttpRule: HttpRuleItem = {
	id: 'rule-1',
	name: 'Rule One',
	kind: 'http-rule',
	enabled: false,
	urlPattern: '/api/b',
	action: 'block',
};

const omit = <T extends object>(obj: T, key: keyof T): Record<string, unknown> => {
	const clone = { ...obj } as unknown as Record<string, unknown>;
	delete clone[key as string];
	return clone;
};

const expectFailure = (result: ReturnType<typeof parseImportedItems>): string => {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected parseImportedItems to fail');
	}
	return result.error;
};

describe('toExportPayload', () => {
	const items: PopupItem[] = [validMockResponse, validHttpRule];

	it('indents with tabs', () => {
		const payload = toExportPayload(items);
		expect(payload).toContain('\n\t{');
		expect(payload).toContain('\n\t\t"id"');
	});

	it('ends with a trailing newline', () => {
		const payload = toExportPayload(items);
		expect(payload.endsWith(']\n')).toBe(true);
	});

	it('round-trips through JSON.parse', () => {
		const payload = toExportPayload(items);
		expect(JSON.parse(payload)).toEqual(items);
	});
});

describe('parseImportedItems', () => {
	it('parses a valid mixed-kind array into the right buckets', () => {
		const result = parseImportedItems(JSON.stringify([validMockResponse, validHttpRule]));

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('expected parseImportedItems to succeed');
		}
		expect(result.mockResponses).toEqual([validMockResponse]);
		expect(result.httpRules).toEqual([validHttpRule]);
	});

	it('accepts an empty array as valid, with both buckets empty', () => {
		const result = parseImportedItems('[]');

		expect(result).toEqual({ ok: true, mockResponses: [], httpRules: [] });
	});

	it('rejects text that is not valid JSON', () => {
		const error = expectFailure(parseImportedItems('{ this is not json'));
		expect(error).toMatch(/Invalid JSON/);
	});

	it('rejects JSON that is not an array', () => {
		const error = expectFailure(parseImportedItems(JSON.stringify({ foo: 'bar' })));
		expect(error).toMatch(/expected a JSON array/i);
	});

	it('rejects an array entry that is not an object', () => {
		const error = expectFailure(parseImportedItems(JSON.stringify(['not-an-object'])));
		expect(error).toMatch(/expected an object/i);
	});

	describe('common field validation', () => {
		it('rejects a missing id', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'id')])),
			);
			expect(error).toMatch(/"id" must be a non-empty string/);
		});

		it('rejects an empty-string id', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, id: '' }])),
			);
			expect(error).toMatch(/"id" must be a non-empty string/);
		});

		it('rejects a missing name', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'name')])),
			);
			expect(error).toMatch(/"name" must be a non-empty string/);
		});

		it('rejects an empty-string name', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, name: '' }])),
			);
			expect(error).toMatch(/"name" must be a non-empty string/);
		});

		it('rejects a missing enabled flag', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'enabled')])),
			);
			expect(error).toMatch(/"enabled" must be a boolean/);
		});

		it('rejects a non-boolean enabled flag', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, enabled: 'yes' }])),
			);
			expect(error).toMatch(/"enabled" must be a boolean/);
		});

		it('rejects a missing kind', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'kind')])),
			);
			expect(error).toMatch(/"kind" must be "mock-response" or "http-rule"/);
		});

		it('rejects an invalid kind value', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, kind: 'something-else' }])),
			);
			expect(error).toMatch(/"kind" must be "mock-response" or "http-rule"/);
		});
	});

	describe('mock-response field validation', () => {
		it('rejects a missing method', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'method')])),
			);
			expect(error).toMatch(/"method" must be one of/);
		});

		it('rejects an invalid method', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, method: 'FETCH' }])),
			);
			expect(error).toMatch(/"method" must be one of/);
		});

		it('rejects a missing urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'urlPattern')])),
			);
			expect(error).toMatch(/"urlPattern" must be a string/);
		});

		it('rejects a non-string urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, urlPattern: 42 }])),
			);
			expect(error).toMatch(/"urlPattern" must be a string/);
		});

		it('rejects a missing statusCode', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validMockResponse, 'statusCode')])),
			);
			expect(error).toMatch(/"statusCode" must be a number/);
		});

		it('rejects a non-number statusCode', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, statusCode: '200' }])),
			);
			expect(error).toMatch(/"statusCode" must be a number/);
		});

		it('rejects a non-string statusText when present', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, statusText: 404 }])),
			);
			expect(error).toMatch(/"statusText" must be a string when present/);
		});

		it('accepts a mock-response with no statusText at all', () => {
			const result = parseImportedItems(
				JSON.stringify([omit(validMockResponse, 'statusText')]),
			);
			expect(result.ok).toBe(true);
		});
	});

	describe('http-rule field validation', () => {
		it('rejects a missing urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validHttpRule, 'urlPattern')])),
			);
			expect(error).toMatch(/"urlPattern" must be a string/);
		});

		it('rejects a non-string urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validHttpRule, urlPattern: 42 }])),
			);
			expect(error).toMatch(/"urlPattern" must be a string/);
		});

		it('rejects a missing action', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validHttpRule, 'action')])),
			);
			expect(error).toMatch(/"action" must be one of/);
		});

		it('rejects an invalid action', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validHttpRule, action: 'destroy' }])),
			);
			expect(error).toMatch(/"action" must be one of/);
		});

		it('rejects a non-string target when present', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validHttpRule, target: 42 }])),
			);
			expect(error).toMatch(/"target" must be a string when present/);
		});

		it('accepts an http-rule with no target at all', () => {
			const result = parseImportedItems(JSON.stringify([validHttpRule]));
			expect(result.ok).toBe(true);
		});
	});

	describe('duplicate id handling', () => {
		it('rejects a duplicate id within the same kind', () => {
			const duplicate = { ...validMockResponse, id: 'shared-id' };
			const other = { ...validMockResponse, id: 'shared-id', name: 'Mock Two' };
			const error = expectFailure(parseImportedItems(JSON.stringify([duplicate, other])));
			expect(error).toMatch(/duplicate id "shared-id"/);
		});

		it('rejects a duplicate id across the two different kinds', () => {
			const mockEntry = { ...validMockResponse, id: 'shared-id' };
			const ruleEntry = { ...validHttpRule, id: 'shared-id' };
			const error = expectFailure(parseImportedItems(JSON.stringify([mockEntry, ruleEntry])));
			expect(error).toMatch(/duplicate id "shared-id"/);
		});
	});

	describe('all-or-nothing validation', () => {
		it('aborts the whole parse on the first invalid entry, returning nothing partial', () => {
			const result = parseImportedItems(
				JSON.stringify([validMockResponse, { ...validHttpRule, action: 'bogus' }]),
			);
			expect(result.ok).toBe(false);
		});
	});

	it('round-trips the sample fixture through export then re-import', () => {
		const payload = toExportPayload(sampleMockResponses as MockResponseItem[]);
		const result = parseImportedItems(payload);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('expected parseImportedItems to succeed');
		}
		expect(result.mockResponses).toEqual(sampleMockResponses);
		expect(result.httpRules).toEqual([]);
	});
});
