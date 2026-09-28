import { resolveMock } from './resolveMock';
import { buildMockAppliedMessage } from '../../shared/messaging/buildMockAppliedMessage';
import { toMockResponseInit } from '../../shared/mocks/toMockResponseInit';
import type { RuleGate } from './ruleGate';
import type { MockResponseInit } from '../../shared/mocks/toMockResponseInit';

type FetchInput = RequestInfo | URL;

export interface CreateFetchInterceptorDeps {
	originalFetch: (input: FetchInput, init?: RequestInit) => Promise<unknown>;
	makeResponse: (init: { status: number; statusText: string; body: string }) => unknown;
	ruleGate: RuleGate;
	getBaseUrl: () => string;
	notifyMockApplied: () => void;
}

/**
 * Extracts the URL string from any `fetch()` input shape.
 *
 * @param input - The URL string, `URL`, or Request-like object passed to `fetch()`.
 * @returns The request's URL as a string.
 */
const resolveUrlString = (input: FetchInput): string => {
	if (typeof input === 'string') {
		return input;
	}
	if (input instanceof URL) {
		return input.href;
	}
	// Request-like: duck-typed rather than `instanceof Request`, because jsdom
	// (and this repo's Jest env) has no global Request — see the constraint above.
	return (input as Request).url;
};

/**
 * Extracts the HTTP method from any `fetch()` input shape.
 *
 * @param input - The URL string, `URL`, or Request-like object passed to `fetch()`.
 * @param init - The `fetch()` init options, whose `method` takes precedence over `input`'s.
 * @returns The resolved method, defaulting to `"GET"`.
 */
const resolveMethod = (input: FetchInput, init?: RequestInit): string => {
	if (init?.method) {
		return init.method;
	}
	if (typeof input !== 'string' && !(input instanceof URL) && 'method' in input) {
		return (input as Request).method;
	}
	return 'GET';
};

/**
 * Builds the replacement `fetch` function: holds requests until the rule gate is ready, then
 * serves a mocked response on a match or falls through to the real network otherwise.
 * Dependency-injected so it can be unit tested without a real `fetch`/`Response`.
 *
 * @param deps.originalFetch - The real fetch to fall through to when nothing matches.
 * @param deps.makeResponse - Builds the actual `Response` for a matched mock.
 * @param deps.ruleGate - Holds the latest rule snapshot posted by the bridge.
 * @param deps.getBaseUrl - Resolves the page's base URL for relative request URLs.
 * @param deps.notifyMockApplied - Called whenever a mock is served, to drive the badge count.
 * @returns The interceptor function to install as `window.fetch`.
 */
export const createFetchInterceptor = ({
	originalFetch,
	makeResponse,
	ruleGate,
	getBaseUrl,
	notifyMockApplied,
}: CreateFetchInterceptorDeps) => {
	return async (input: FetchInput, init?: RequestInit): Promise<unknown> => {
		if (!ruleGate.isReady()) {
			console.log(
				'[devtools-plus] holding fetch until the first rule snapshot arrives:',
				resolveUrlString(input),
			);
			await ruleGate.waitUntilReady();
		}

		const method = resolveMethod(input, init);
		const url = resolveUrlString(input);
		const match = resolveMock(ruleGate, method, url, getBaseUrl());

		if (!match) {
			return originalFetch(input, init);
		}

		notifyMockApplied();
		return makeResponse(toMockResponseInit(match));
	};
};

/**
 * Patches `window.fetch` with the mock-aware interceptor.
 *
 * @param ruleGate - Holds the latest rule snapshot posted by the bridge.
 * @returns A restore function that puts the original `window.fetch` back.
 */
export const installFetchInterceptor = (ruleGate: RuleGate): (() => void) => {
	const originalFetch = window.fetch.bind(window);
	const makeResponse = (init: MockResponseInit): Response => {
		const body = init.body === '' ? undefined : init.body;

		try {
			return new Response(body, {
				status: init.status,
				statusText: init.statusText,
			});
		} catch (error) {
			console.error(
				`[devtools-plus] mock response for status ${init.status} "${init.statusText}" could not be constructed; serving a degraded response instead:`,
				error,
			);
			const safeStatus =
				Number.isInteger(init.status) && init.status >= 200 && init.status <= 599
					? init.status
					: 500;
			return new Response(undefined, { status: safeStatus });
		}
	};

	window.fetch = createFetchInterceptor({
		originalFetch,
		makeResponse,
		ruleGate,
		getBaseUrl: () => document.baseURI,
		notifyMockApplied: () => window.postMessage(buildMockAppliedMessage(), window.location.origin),
	}) as typeof fetch;

	return () => {
		window.fetch = originalFetch;
	};
};
