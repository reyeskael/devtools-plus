import { HTTP_METHODS } from './types';
import type { HttpMethod, MockResponseItem, PopupItem, RedirectRuleItem } from './types';

const REDIRECT_MATCH_TYPES: RedirectRuleItem['matchType'][] = ['wildcard', 'regex'];

/** Result of {@link parseImportedItems}: the parsed items, or the first validation error hit. */
export type ParseResult =
	| { ok: true; mockResponses: MockResponseItem[]; redirects: RedirectRuleItem[] }
	| { ok: false; error: string };

/**
 * Serializes items for the Export feature's downloaded `.json` file.
 *
 * @param items - The mock responses and/or redirect rules to export.
 * @returns Pretty-printed JSON, newline-terminated.
 */
export const toExportPayload = (items: PopupItem[]): string =>
	`${JSON.stringify(items, null, '\t')}\n`;

/**
 * Builds a human-readable label for an entry in a validation error message.
 *
 * @param index - The entry's position in the imported array.
 * @param entry - The raw, not-yet-validated entry.
 * @returns `"entry N (id \"...\")"` when an id can be read off the entry, else `"entry N"`.
 */
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

/**
 * Detects an old-format `HttpRuleItem`-shaped entry (`kind: 'http-rule'` with an `action` field
 * — `block` / `redirect` / `modify-headers`) from a pre-existing JSON export. That data model was
 * removed entirely in favor of `kind: 'redirect'`, and this old shape is deliberately rejected
 * rather than auto-migrated (see the plan's decision log, Q9).
 *
 * @param entry - The raw, not-yet-validated entry.
 * @returns Whether `entry` looks like a legacy `http-rule` item.
 */
const isLegacyHttpRuleShaped = (entry: Record<string, unknown>): boolean =>
	entry.kind === 'http-rule' && typeof entry.action === 'string';

/**
 * Validates the fields every item shares, regardless of kind.
 *
 * @param index - The entry's position in the imported array.
 * @param entry - The raw, not-yet-validated entry.
 * @returns An error message, or `null` if the common fields are valid.
 */
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
	if (entry.kind !== 'mock-response' && entry.kind !== 'redirect') {
		return `${describeEntry(index, entry)}: "kind" must be "mock-response" or "redirect"`;
	}
	return null;
};

/**
 * Validates the fields specific to a `mock-response` entry.
 *
 * @param index - The entry's position in the imported array.
 * @param entry - The raw, not-yet-validated entry.
 * @returns An error message, or `null` if the mock-response fields are valid.
 */
const validateMockResponse = (index: number, entry: Record<string, unknown>): string | null => {
	if (typeof entry.method !== 'string' || !HTTP_METHODS.includes(entry.method as HttpMethod)) {
		return `${describeEntry(index, entry)}: "method" must be one of ${HTTP_METHODS.join(', ')}`;
	}
	if (typeof entry.urlPattern !== 'string' || entry.urlPattern.length === 0) {
		return `${describeEntry(index, entry)}: "urlPattern" must be a non-empty string`;
	}
	if (typeof entry.statusCode !== 'number') {
		return `${describeEntry(index, entry)}: "statusCode" must be a number`;
	}
	if (entry.statusText !== undefined && typeof entry.statusText !== 'string') {
		return `${describeEntry(index, entry)}: "statusText" must be a string when present`;
	}
	return null;
};

/**
 * Validates the fields specific to a `redirect` entry.
 *
 * @param index - The entry's position in the imported array.
 * @param entry - The raw, not-yet-validated entry.
 * @returns An error message, or `null` if the redirect fields are valid.
 */
const validateRedirect = (index: number, entry: Record<string, unknown>): string | null => {
	if (
		typeof entry.matchType !== 'string' ||
		!REDIRECT_MATCH_TYPES.includes(entry.matchType as RedirectRuleItem['matchType'])
	) {
		return `${describeEntry(index, entry)}: "matchType" must be one of ${REDIRECT_MATCH_TYPES.join(', ')}`;
	}
	if (typeof entry.urlPattern !== 'string' || entry.urlPattern.length === 0) {
		return `${describeEntry(index, entry)}: "urlPattern" must be a non-empty string`;
	}
	if (typeof entry.destination !== 'string' || entry.destination.length === 0) {
		return `${describeEntry(index, entry)}: "destination" must be a non-empty string`;
	}
	if (entry.methods !== undefined) {
		if (
			!Array.isArray(entry.methods) ||
			!entry.methods.every((method) => HTTP_METHODS.includes(method as HttpMethod))
		) {
			return `${describeEntry(index, entry)}: "methods" must be an array of ${HTTP_METHODS.join(', ')} when present`;
		}
	}
	return null;
};

/**
 * Parses and validates the Import feature's input — a JSON array of items, either picked as a
 * `.json` file or pasted as text — splitting valid entries into mock responses and redirect
 * rules.
 *
 * @param text - The raw JSON text to parse.
 * @returns `{ ok: true, mockResponses, redirects }` on success, or `{ ok: false, error }` with
 * the first validation failure encountered (JSON parse error, non-array root, unknown `kind`,
 * a rejected legacy `http-rule` entry, duplicate `id`, or a missing/mistyped field).
 */
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
	const redirects: RedirectRuleItem[] = [];
	const seenIds = new Set<string>();

	for (let index = 0; index < parsed.length; index += 1) {
		const rawEntry = parsed[index];
		if (!rawEntry || typeof rawEntry !== 'object') {
			return { ok: false, error: `${describeEntry(index, rawEntry)}: expected an object` };
		}
		const entry = rawEntry as Record<string, unknown>;

		if (isLegacyHttpRuleShaped(entry)) {
			return {
				ok: false,
				error: `${describeEntry(index, entry)}: this file uses the old "http-rule" format (block/redirect/modify-headers), which is no longer supported. Recreate this rule as a "redirect" item — it cannot be imported automatically.`,
			};
		}

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
			const error = validateRedirect(index, entry);
			if (error) {
				return { ok: false, error };
			}
			redirects.push(entry as unknown as RedirectRuleItem);
		}
	}

	return { ok: true, mockResponses, redirects };
};
