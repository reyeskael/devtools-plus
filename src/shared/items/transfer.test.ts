import { parseImportedItems, toExportPayload } from './transfer';
import type { MockResponseItem, PopupItem, RedirectRuleItem } from './types';
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

const validRedirect: RedirectRuleItem = {
	id: 'rule-1',
	name: 'Rule One',
	kind: 'redirect',
	enabled: false,
	matchType: 'wildcard',
	urlPattern: '/api/b',
	destination: '/api/b-new',
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
	const items: PopupItem[] = [validMockResponse, validRedirect];

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
		const result = parseImportedItems(JSON.stringify([validMockResponse, validRedirect]));

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('expected parseImportedItems to succeed');
		}
		expect(result.mockResponses).toEqual([validMockResponse]);
		expect(result.redirects).toEqual([validRedirect]);
	});

	it('accepts an empty array as valid, with both buckets empty', () => {
		const result = parseImportedItems('[]');

		expect(result).toEqual({ ok: true, mockResponses: [], redirects: [] });
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
			expect(error).toMatch(/"kind" must be "mock-response" or "redirect"/);
		});

		it('rejects an invalid kind value', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, kind: 'something-else' }])),
			);
			expect(error).toMatch(/"kind" must be "mock-response" or "redirect"/);
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
			expect(error).toMatch(/"urlPattern" must be a non-empty string/);
		});

		it('rejects a non-string urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, urlPattern: 42 }])),
			);
			expect(error).toMatch(/"urlPattern" must be a non-empty string/);
		});

		it('rejects an empty-string urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validMockResponse, urlPattern: '' }])),
			);
			expect(error).toMatch(/"urlPattern" must be a non-empty string/);
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

	describe('redirect field validation', () => {
		it('rejects a missing matchType', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validRedirect, 'matchType')])),
			);
			expect(error).toMatch(/"matchType" must be one of/);
		});

		it('rejects an invalid matchType', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validRedirect, matchType: 'glob' }])),
			);
			expect(error).toMatch(/"matchType" must be one of/);
		});

		it('accepts "regex" as a matchType', () => {
			const result = parseImportedItems(
				JSON.stringify([{ ...validRedirect, matchType: 'regex' }]),
			);
			expect(result.ok).toBe(true);
		});

		it('rejects a missing urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validRedirect, 'urlPattern')])),
			);
			expect(error).toMatch(/"urlPattern" must be a non-empty string/);
		});

		it('rejects a non-string urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validRedirect, urlPattern: 42 }])),
			);
			expect(error).toMatch(/"urlPattern" must be a non-empty string/);
		});

		it('rejects an empty-string urlPattern', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validRedirect, urlPattern: '' }])),
			);
			expect(error).toMatch(/"urlPattern" must be a non-empty string/);
		});

		it('rejects a missing destination', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([omit(validRedirect, 'destination')])),
			);
			expect(error).toMatch(/"destination" must be a non-empty string/);
		});

		it('rejects an empty-string destination', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validRedirect, destination: '' }])),
			);
			expect(error).toMatch(/"destination" must be a non-empty string/);
		});

		it('rejects a non-array methods field', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validRedirect, methods: 'GET' }])),
			);
			expect(error).toMatch(/"methods" must be an array of/);
		});

		it('rejects a methods array containing an invalid method', () => {
			const error = expectFailure(
				parseImportedItems(JSON.stringify([{ ...validRedirect, methods: ['GET', 'FETCH'] }])),
			);
			expect(error).toMatch(/"methods" must be an array of/);
		});

		it('accepts a redirect with no methods at all (all methods)', () => {
			const result = parseImportedItems(JSON.stringify([validRedirect]));
			expect(result.ok).toBe(true);
		});

		it('accepts a redirect with an empty methods array (also "all methods")', () => {
			const result = parseImportedItems(
				JSON.stringify([{ ...validRedirect, methods: [] }]),
			);
			expect(result.ok).toBe(true);
			if (!result.ok) {
				throw new Error('expected parseImportedItems to succeed');
			}
			expect(result.redirects).toEqual([{ ...validRedirect, methods: [] }]);
		});

		it('accepts a redirect with a valid, non-empty methods list', () => {
			const result = parseImportedItems(
				JSON.stringify([{ ...validRedirect, methods: ['GET', 'POST'] }]),
			);
			expect(result.ok).toBe(true);
		});
	});

	describe('legacy http-rule rejection', () => {
		it('rejects an old-format entry with kind "http-rule" and action "block"', () => {
			const legacyEntry = {
				id: 'legacy-1',
				name: 'Block legacy API',
				kind: 'http-rule',
				enabled: true,
				urlPattern: '/api/legacy/*',
				action: 'block',
			};
			const error = expectFailure(parseImportedItems(JSON.stringify([legacyEntry])));
			expect(error).toMatch(/no longer supported/);
			expect(error).toMatch(/http-rule/);
		});

		it('rejects an old-format entry with kind "http-rule" and action "redirect"', () => {
			const legacyEntry = {
				id: 'legacy-2',
				name: 'Redirect old path',
				kind: 'http-rule',
				enabled: false,
				urlPattern: '/old/path',
				action: 'redirect',
				target: '/new/path',
			};
			const error = expectFailure(parseImportedItems(JSON.stringify([legacyEntry])));
			expect(error).toMatch(/no longer supported/);
		});

		it('rejects an old-format entry with kind "http-rule" and action "modify-headers"', () => {
			const legacyEntry = {
				id: 'legacy-3',
				name: 'Strip auth header',
				kind: 'http-rule',
				enabled: true,
				urlPattern: '/api/public/*',
				action: 'modify-headers',
			};
			const error = expectFailure(parseImportedItems(JSON.stringify([legacyEntry])));
			expect(error).toMatch(/no longer supported/);
		});

		it('aborts the whole parse when a legacy entry appears alongside otherwise-valid entries', () => {
			const legacyEntry = {
				id: 'legacy-4',
				name: 'Block legacy API',
				kind: 'http-rule',
				enabled: true,
				urlPattern: '/api/legacy/*',
				action: 'block',
			};
			const result = parseImportedItems(
				JSON.stringify([validMockResponse, legacyEntry, validRedirect]),
			);
			expect(result.ok).toBe(false);
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
			const redirectEntry = { ...validRedirect, id: 'shared-id' };
			const error = expectFailure(parseImportedItems(JSON.stringify([mockEntry, redirectEntry])));
			expect(error).toMatch(/duplicate id "shared-id"/);
		});
	});

	describe('all-or-nothing validation', () => {
		it('aborts the whole parse on the first invalid entry, returning nothing partial', () => {
			const result = parseImportedItems(
				JSON.stringify([validMockResponse, { ...validRedirect, matchType: 'bogus' }]),
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
		expect(result.redirects).toEqual([]);
	});

	it('round-trips a redirect item through export then re-import', () => {
		const payload = toExportPayload([validRedirect]);
		const result = parseImportedItems(payload);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error('expected parseImportedItems to succeed');
		}
		expect(result.redirects).toEqual([validRedirect]);
		expect(result.mockResponses).toEqual([]);
	});
});
