import { HTTP_METHODS } from './types';
import { NULL_BODY_STATUSES } from '../mocks/nullBodyStatuses';
import type { HttpMethod, MockResponseItem } from './types';

/** The all-string form-state shape a mock response editor form holds while a user is typing. */
export interface MockResponseDraft {
	name: string;
	method: HttpMethod;
	urlPattern: string;
	statusCode: string;
	statusText: string;
	body: string;
	enabled: boolean;
}

/** Result of {@link validateMockResponseDraft}: the parsed fields, or one error per bad field. */
export type ValidateMockResponseDraftResult =
	| {
			ok: true;
			name: string;
			method: HttpMethod;
			urlPattern: string;
			statusCode: number;
			statusText?: string;
			body?: unknown;
	  }
	| { ok: false; errors: Partial<Record<keyof MockResponseDraft, string>> };

/**
 * Validates a mock response editor form's draft state, parsing its string fields into the
 * types `MockResponseItem` needs.
 *
 * @param draft - The form's current, all-string field values.
 * @returns `{ ok: true, ... }` with the parsed fields on success — `body` omitted for a status
 * in {@link NULL_BODY_STATUSES} even if the draft had body text — or `{ ok: false, errors }`
 * with every field that failed validation, keyed by field name.
 */
export const validateMockResponseDraft = (
	draft: MockResponseDraft,
): ValidateMockResponseDraftResult => {
	const errors: Partial<Record<keyof MockResponseDraft, string>> = {};

	const name = draft.name.trim();
	if (name.length === 0) {
		errors.name = 'Name is required';
	}

	if (!HTTP_METHODS.includes(draft.method)) {
		errors.method = `Method must be one of ${HTTP_METHODS.join(', ')}`;
	}

	if (draft.urlPattern.length === 0) {
		errors.urlPattern = 'URL pattern must be a non-empty string';
	}

	const statusCode = Number(draft.statusCode.trim());
	if (
		draft.statusCode.trim().length === 0 ||
		!Number.isInteger(statusCode) ||
		statusCode < 100 ||
		statusCode > 599
	) {
		errors.statusCode = 'Status code must be an integer between 100 and 599';
	}

	const statusText = draft.statusText.trim();

	const trimmedBody = draft.body.trim();
	let body: unknown;
	if (trimmedBody.length > 0) {
		try {
			body = JSON.parse(trimmedBody);
		} catch {
			errors.body = 'Body must be valid JSON';
		}
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		name,
		method: draft.method,
		urlPattern: draft.urlPattern,
		statusCode,
		statusText: statusText.length > 0 ? statusText : undefined,
		body: NULL_BODY_STATUSES.has(statusCode) || trimmedBody.length === 0 ? undefined : body,
	};
};

/**
 * Converts a validated mock response draft into the full item the popup's item list needs.
 *
 * @param draft - The form's draft state; must already pass {@link validateMockResponseDraft}.
 * @param id - The id to assign the new item.
 * @returns The full `MockResponseItem`.
 * @throws If `draft` fails validation — callers should validate before converting.
 */
export const toMockResponseItem = (draft: MockResponseDraft, id: string): MockResponseItem => {
	const result = validateMockResponseDraft(draft);
	if (!result.ok) {
		throw new Error('Cannot convert an invalid MockResponseDraft to a MockResponseItem');
	}

	return {
		id,
		kind: 'mock-response',
		name: result.name,
		enabled: draft.enabled,
		method: result.method,
		urlPattern: result.urlPattern,
		statusCode: result.statusCode,
		statusText: result.statusText,
		body: result.body,
	};
};
