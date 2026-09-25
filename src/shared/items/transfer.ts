import type { HttpMethod, HttpRuleItem, MockResponseItem, PopupItem } from './types';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const HTTP_RULE_ACTIONS: HttpRuleItem['action'][] = ['block', 'redirect', 'modify-headers'];

export type ParseResult =
	| { ok: true; mockResponses: MockResponseItem[]; httpRules: HttpRuleItem[] }
	| { ok: false; error: string };

export const toExportPayload = (items: PopupItem[]): string =>
	`${JSON.stringify(items, null, '\t')}\n`;

const describeEntry = (index: number, entry: unknown): string => {
	if (
		entry &&
		typeof entry === 'object' &&
		'id' in entry &&
		typeof (entry as { id: unknown }).id === 'string'
	) {
		return `entry ${index} (id "${(entry as { id: string }).id}")`;
	}
	return `entry ${index}`;
};

const validateCommon = (index: number, entry: Record<string, unknown>): string | null => {
	if (typeof entry.id !== 'string' || entry.id.length === 0) {
		return `${describeEntry(index, entry)}: "id" must be a non-empty string`;
	}
	if (typeof entry.name !== 'string' || entry.name.length === 0) {
		return `${describeEntry(index, entry)}: "name" must be a non-empty string`;
	}
	if (typeof entry.enabled !== 'boolean') {
		return `${describeEntry(index, entry)}: "enabled" must be a boolean`;
	}
	if (entry.kind !== 'mock-response' && entry.kind !== 'http-rule') {
		return `${describeEntry(index, entry)}: "kind" must be "mock-response" or "http-rule"`;
	}
	return null;
};

const validateMockResponse = (index: number, entry: Record<string, unknown>): string | null => {
	if (typeof entry.method !== 'string' || !HTTP_METHODS.includes(entry.method as HttpMethod)) {
		return `${describeEntry(index, entry)}: "method" must be one of ${HTTP_METHODS.join(', ')}`;
	}
	if (typeof entry.urlPattern !== 'string') {
		return `${describeEntry(index, entry)}: "urlPattern" must be a string`;
	}
	if (typeof entry.statusCode !== 'number') {
		return `${describeEntry(index, entry)}: "statusCode" must be a number`;
	}
	if (entry.statusText !== undefined && typeof entry.statusText !== 'string') {
		return `${describeEntry(index, entry)}: "statusText" must be a string when present`;
	}
	return null;
};

const validateHttpRule = (index: number, entry: Record<string, unknown>): string | null => {
	if (typeof entry.urlPattern !== 'string') {
		return `${describeEntry(index, entry)}: "urlPattern" must be a string`;
	}
	if (
		typeof entry.action !== 'string' ||
		!HTTP_RULE_ACTIONS.includes(entry.action as HttpRuleItem['action'])
	) {
		return `${describeEntry(index, entry)}: "action" must be one of ${HTTP_RULE_ACTIONS.join(', ')}`;
	}
	if (entry.target !== undefined && typeof entry.target !== 'string') {
		return `${describeEntry(index, entry)}: "target" must be a string when present`;
	}
	return null;
};

export const parseImportedItems = (text: string): ParseResult => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: `Invalid JSON: ${message}` };
	}

	if (!Array.isArray(parsed)) {
		return { ok: false, error: 'Invalid import file: expected a JSON array of items' };
	}

	const mockResponses: MockResponseItem[] = [];
	const httpRules: HttpRuleItem[] = [];
	const seenIds = new Set<string>();

	for (let index = 0; index < parsed.length; index += 1) {
		const rawEntry = parsed[index];
		if (!rawEntry || typeof rawEntry !== 'object') {
			return { ok: false, error: `${describeEntry(index, rawEntry)}: expected an object` };
		}
		const entry = rawEntry as Record<string, unknown>;

		const commonError = validateCommon(index, entry);
		if (commonError) {
			return { ok: false, error: commonError };
		}

		const id = entry.id as string;
		if (seenIds.has(id)) {
			return { ok: false, error: `${describeEntry(index, entry)}: duplicate id "${id}"` };
		}
		seenIds.add(id);

		if (entry.kind === 'mock-response') {
			const error = validateMockResponse(index, entry);
			if (error) {
				return { ok: false, error };
			}
			mockResponses.push(entry as unknown as MockResponseItem);
		} else {
			const error = validateHttpRule(index, entry);
			if (error) {
				return { ok: false, error };
			}
			httpRules.push(entry as unknown as HttpRuleItem);
		}
	}

	return { ok: true, mockResponses, httpRules };
};
