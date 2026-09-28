/** Fields common to every item shown in the popup's toolbar list. */
interface PopupItemBase {
	id: string;
	name: string;
	enabled: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

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

/**
 * An HTTP rule (block / redirect / modify-headers) targeting requests whose URL matches
 * `urlPattern`. Listed in the popup but not yet enforced — intended to be built on
 * `chrome.declarativeNetRequest`, per the repo's CLAUDE.md.
 */
export interface HttpRuleItem extends PopupItemBase {
	kind: 'http-rule';
	urlPattern: string;
	action: 'block' | 'redirect' | 'modify-headers';
	target?: string;
}

/** Either kind of popup item, discriminated by `kind`. */
export type PopupItem = MockResponseItem | HttpRuleItem;
