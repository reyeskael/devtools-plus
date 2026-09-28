import { resolveMock } from './resolveMock';
import { buildMockAppliedMessage } from '../../shared/messaging/buildMockAppliedMessage';
import { toMockResponseInit } from '../../shared/mocks/toMockResponseInit';
import type { RuleGate } from './ruleGate';

interface XhrWithMeta extends XMLHttpRequest {
	__devtoolsPlusMethod?: string;
	__devtoolsPlusUrl?: string;
}

const defaultGetBaseUrl = (): string => document.baseURI;

const defaultNotifyMockApplied = (): void => {
	window.postMessage(buildMockAppliedMessage(), window.location.origin);
};

type ShadowedProperty = 'readyState' | 'status' | 'statusText' | 'responseText' | 'response';

/**
 * Overrides a normally-native, read-only XHR property with an own property carrying a mocked
 * value.
 *
 * @param xhr - The XHR instance to shadow a property on.
 * @param property - Which property to shadow.
 * @param value - The value readers of `property` should see.
 */
const shadowProperty = (xhr: XMLHttpRequest, property: ShadowedProperty, value: unknown): void => {
	Object.defineProperty(xhr, property, { configurable: true, value });
};

const SHADOWED_PROPERTIES: ShadowedProperty[] = [
	'readyState',
	'status',
	'statusText',
	'responseText',
	'response',
];

/**
 * Removes any own properties shadowed by a prior mocked response on this same instance, so
 * the native prototype getters take over again for a new request.
 *
 * @param xhr - The XHR instance being reused for a new `open()` call.
 */
const clearShadowedProperties = (xhr: XMLHttpRequest): void => {
	SHADOWED_PROPERTIES.forEach((property) => {
		delete (xhr as Record<ShadowedProperty, unknown>)[property];
	});
};

/**
 * Builds the value `xhr.response` should return for a mocked body, honoring `responseType`.
 * Only `'json'` is emulated beyond the raw string; `blob`, `arraybuffer`, and `document`
 * response types aren't supported since sample-data.json only ever needs JSON mocks.
 *
 * @param xhr - The XHR instance whose `responseType` determines the parsing.
 * @param body - The mocked response body as a raw string.
 * @returns The parsed JSON value when `responseType === 'json'` (`null` on parse failure),
 * otherwise `body` unchanged.
 */
const parseResponseFor = (xhr: XMLHttpRequest, body: string): unknown => {
	if (xhr.responseType !== 'json') {
		return body;
	}
	try {
		return JSON.parse(body);
	} catch {
		return null;
	}
};

/**
 * Shadows a mocked response onto an XHR instance and fires the events a real completed
 * request would, so app code observing `readystatechange`/`load`/`loadend` behaves normally.
 *
 * @param xhr - The XHR instance to serve the mocked response on.
 * @param status - The mocked HTTP status code.
 * @param statusText - The mocked status text.
 * @param body - The mocked response body as a raw string.
 */
const dispatchMockedResponse = (
	xhr: XMLHttpRequest,
	status: number,
	statusText: string,
	body: string,
): void => {
	shadowProperty(xhr, 'readyState', 4);
	shadowProperty(xhr, 'status', status);
	shadowProperty(xhr, 'statusText', statusText);
	shadowProperty(xhr, 'responseText', body);
	shadowProperty(xhr, 'response', parseResponseFor(xhr, body));

	xhr.dispatchEvent(new Event('readystatechange'));
	xhr.dispatchEvent(new Event('load'));
	xhr.dispatchEvent(new Event('loadend'));
};

/**
 * Patches `XMLHttpRequest.prototype.open`/`send` with the mock-aware interceptor.
 *
 * @param ruleGate - Holds the latest rule snapshot posted by the bridge.
 * @param getBaseUrl - Resolves the page's base URL for relative request URLs.
 * @param notifyMockApplied - Called whenever a mock is served, to drive the badge count.
 * @returns A restore function that puts the original `open`/`send` back.
 */
export const installXhrInterceptor = (
	ruleGate: RuleGate,
	getBaseUrl: () => string = defaultGetBaseUrl,
	notifyMockApplied: () => void = defaultNotifyMockApplied,
): (() => void) => {
	const originalOpen = XMLHttpRequest.prototype.open;
	const originalSend = XMLHttpRequest.prototype.send;

	XMLHttpRequest.prototype.open = function (
		this: XhrWithMeta,
		...args: Parameters<typeof originalOpen>
	) {
		const [method, url] = args;
		clearShadowedProperties(this);
		this.__devtoolsPlusMethod = method;
		this.__devtoolsPlusUrl = typeof url === 'string' ? url : url.href;
		return originalOpen.apply(this, args);
	} as typeof XMLHttpRequest.prototype.open;

	XMLHttpRequest.prototype.send = function (
		this: XhrWithMeta,
		...args: Parameters<typeof originalSend>
	) {
		const method = this.__devtoolsPlusMethod ?? 'GET';
		const url = this.__devtoolsPlusUrl ?? '';

		const proceed = (): void => {
			const match = resolveMock(ruleGate, method, url, getBaseUrl());
			if (!match) {
				originalSend.apply(this, args);
				return;
			}
			notifyMockApplied();
			const { status, statusText, body } = toMockResponseInit(match);
			Promise.resolve().then(() => {
				dispatchMockedResponse(this, status, statusText, body);
			});
		};

		if (!ruleGate.isReady()) {
			console.log(
				'[devtools-plus] holding XMLHttpRequest until the first rule snapshot arrives:',
				url,
			);
			ruleGate.waitUntilReady().then(proceed);
			return;
		}

		proceed();
	} as typeof XMLHttpRequest.prototype.send;

	return () => {
		XMLHttpRequest.prototype.open = originalOpen;
		XMLHttpRequest.prototype.send = originalSend;
	};
};
