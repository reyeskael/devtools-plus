import { resolveMock } from './resolveMock';
import { toMockResponseInit } from '../../shared/mocks/toMockResponseInit';
import type { RuleGate } from './ruleGate';
import type { MockResponseInit } from '../../shared/mocks/toMockResponseInit';

type FetchInput = RequestInfo | URL;

export interface CreateFetchInterceptorDeps {
	originalFetch: (input: FetchInput, init?: RequestInit) => Promise<unknown>;
	makeResponse: (init: { status: number; statusText: string; body: string }) => unknown;
	ruleGate: RuleGate;
	getBaseUrl: () => string;
}

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

const resolveMethod = (input: FetchInput, init?: RequestInit): string => {
	if (init?.method) {
		return init.method;
	}
	if (typeof input !== 'string' && !(input instanceof URL) && 'method' in input) {
		return (input as Request).method;
	}
	return 'GET';
};

export const createFetchInterceptor = ({
	originalFetch,
	makeResponse,
	ruleGate,
	getBaseUrl,
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

		return makeResponse(toMockResponseInit(match));
	};
};

// Statuses that the Fetch spec forbids from carrying a body ("null body status").
// Passing a non-empty body for one of these throws when constructing a Response.
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export const installFetchInterceptor = (ruleGate: RuleGate): (() => void) => {
	const originalFetch = window.fetch.bind(window);
	const makeResponse = (init: MockResponseInit): Response => {
		const body =
			init.body === '' || NULL_BODY_STATUSES.has(init.status) ? undefined : init.body;

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
	}) as typeof fetch;

	return () => {
		window.fetch = originalFetch;
	};
};
