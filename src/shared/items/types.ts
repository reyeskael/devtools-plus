/** Fields common to every item shown in the popup's toolbar list. */
interface PopupItemBase {
	id: string;
	name: string;
	enabled: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const HTTP_METHODS: HttpMethod[] = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
];

/**
 * A single mocked response rule: when `method` and `urlPattern` match a request, the
 * interceptor serves `statusCode`/`statusText`/`body` back instead of hitting the network.
 */
export interface MockResponseItem extends PopupItemBase {
	kind: 'mock-response';
	method: HttpMethod;
	urlPattern: string;
	statusCode: number;
	statusText?: string;
	body?: unknown;
}

/** How a redirect rule's `urlPattern` is interpreted when matching a request URL. */
export type RedirectMatchType = 'wildcard' | 'regex';

/**
 * A redirect rule: when a request URL matches `urlPattern` (as a wildcard or regex pattern,
 * per `matchType`), the request is sent to `destination` instead. Enforced via
 * `chrome.declarativeNetRequest`, per the repo's CLAUDE.md.
 */
export interface RedirectRuleItem extends PopupItemBase {
	kind: 'redirect';
	matchType: RedirectMatchType;
	urlPattern: string;
	/** A static destination URL, or a template with `$1`..`$9` capture-group refs (`$$` escapes a literal `$`). */
	destination: string;
	/** HTTP methods this rule applies to. Omitted or empty means "all methods". */
	methods?: HttpMethod[];
}

/** Either kind of popup item, discriminated by `kind`. */
export type PopupItem = MockResponseItem | RedirectRuleItem;
