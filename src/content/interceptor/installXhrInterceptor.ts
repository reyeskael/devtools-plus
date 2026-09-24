import { resolveMock } from './resolveMock';
import { toMockResponseInit } from '../../shared/mocks/toMockResponseInit';
import type { RuleGate } from './ruleGate';

interface XhrWithMeta extends XMLHttpRequest {
	__devtoolsPlusMethod?: string;
	__devtoolsPlusUrl?: string;
}

const defaultGetBaseUrl = (): string => document.baseURI;

type ShadowedProperty = 'readyState' | 'status' | 'statusText' | 'responseText' | 'response';

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

// Removes any own properties shadowed by a prior mocked response on this same
// instance, so the native prototype getters take over again for a new request.
const clearShadowedProperties = (xhr: XMLHttpRequest): void => {
	SHADOWED_PROPERTIES.forEach((property) => {
		delete (xhr as Record<ShadowedProperty, unknown>)[property];
	});
};

// Only `responseType === 'json'` is emulated beyond the raw string; `blob`,
// `arraybuffer`, and `document` response types aren't supported since
// sample-data.json only ever needs JSON mocks.
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

export const installXhrInterceptor = (
	ruleGate: RuleGate,
	getBaseUrl: () => string = defaultGetBaseUrl,
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
