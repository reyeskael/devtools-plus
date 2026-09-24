import { createFetchInterceptor } from './installFetchInterceptor';
import { createRuleGate, HOLD_TIMEOUT_MS } from './ruleGate';
import { makeResponse } from '../../shared/mocks/__testing__/makeResponse';
import { createOriginalFetch } from '../../shared/mocks/__testing__/originalFetch';
import { seedMockResponses } from '../../shared/items/seedItems';
import type { FakeResponse } from '../../shared/mocks/__testing__/makeResponse';
import type { RuleSnapshot } from '../../shared/messaging/types';
import type { MockResponseItem } from '../../shared/items/types';

const mockUsersGet: MockResponseItem = {
	id: 'mock-users-get',
	name: 'Users list',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/users',
	statusCode: 200,
	statusText: 'OK',
	body: { users: [] },
};

const snapshotWith = (overrides: Partial<RuleSnapshot> = {}): RuleSnapshot => ({
	mockResponses: [mockUsersGet],
	httpRules: [],
	isRunning: true,
	...overrides,
});

const findById = (id: string): MockResponseItem => {
	const item = seedMockResponses.find((entry) => entry.id === id);
	if (!item) {
		throw new Error(`Fixture item "${id}" not found in seedMockResponses`);
	}
	return item;
};

const expectMockResponse = (
	result: unknown,
	expected: { status: number; statusText: string; body: string },
): void => {
	const response = result as FakeResponse;
	expect(response.status).toBe(expected.status);
	expect(response.statusText).toBe(expected.statusText);
	expect(response.body).toBe(expected.body);
};

describe('createFetchInterceptor', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('holds a request until a snapshot arrives, then serves a matching mock', async () => {
		jest.useFakeTimers();
		const ruleGate = createRuleGate();
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		let settled = false;
		const promise = interceptor('https://example.com/api/users').then((result) => {
			settled = true;
			return result;
		});

		await Promise.resolve();
		expect(settled).toBe(false);
		expect(originalFetch).not.toHaveBeenCalled();

		ruleGate.setSnapshot(snapshotWith());

		const result = await promise;
		expectMockResponse(result, { status: 200, statusText: 'OK', body: JSON.stringify(mockUsersGet.body) });
		expect(originalFetch).not.toHaveBeenCalled();
	});

	it('holds a request until a snapshot arrives, then passes through when nothing matches', async () => {
		jest.useFakeTimers();
		const ruleGate = createRuleGate();
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const promise = interceptor('https://example.com/api/orders');

		await Promise.resolve();
		expect(originalFetch).not.toHaveBeenCalled();

		ruleGate.setSnapshot(snapshotWith());

		await promise;
		expect(originalFetch).toHaveBeenCalledWith('https://example.com/api/orders', undefined);
	});

	it('releases held requests to the real network once the hold times out', async () => {
		jest.useFakeTimers();
		const ruleGate = createRuleGate();
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const promise = interceptor('https://example.com/api/users');

		jest.advanceTimersByTime(HOLD_TIMEOUT_MS);
		await promise;

		expect(originalFetch).toHaveBeenCalledWith('https://example.com/api/users', undefined);
	});

	it('passes through the exact input and init, and returns originalFetch\'s value by identity, when nothing matches', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		const response = { status: 200 };
		const originalFetch = jest.fn().mockResolvedValue(response);
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const input = 'https://example.com/api/orders';
		const init = { method: 'GET', headers: { 'x-test': '1' } };

		const result = await interceptor(input, init);

		expect(originalFetch).toHaveBeenCalledWith(input, init);
		expect(result).toBe(response);
	});

	it('accepts a string URL, a URL instance, and a Request-shaped object as input', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		await interceptor('https://example.com/api/users');
		expect(originalFetch).not.toHaveBeenCalled();

		await interceptor(new URL('https://example.com/api/users'));
		expect(originalFetch).not.toHaveBeenCalled();

		const requestLike = { url: 'https://example.com/api/users', method: 'GET' } as Request;
		await interceptor(requestLike);
		expect(originalFetch).not.toHaveBeenCalled();
	});

	it('resolves a relative URL against getBaseUrl before matching', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const result = await interceptor('/api/users');

		expect(originalFetch).not.toHaveBeenCalled();
		expectMockResponse(result, { status: 200, statusText: 'OK', body: JSON.stringify(mockUsersGet.body) });
	});

	it('serves the bodyless 404 sample entry with an empty body', async () => {
		const item404 = { ...findById('mock-yearly-summary-404'), enabled: true };
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith({ mockResponses: [item404] }));
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const result = await interceptor(
			'https://example.com/api/excite/v2/account-summary-api/v1/summary/yearly',
		);

		expectMockResponse(result, { status: 404, statusText: 'Not Found', body: '' });
	});

	it('serves the bodyless 500 sample entry with an empty body', async () => {
		const item500 = { ...findById('mock-yearly-summary-500'), enabled: true };
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith({ mockResponses: [item500] }));
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const result = await interceptor(
			'https://example.com/api/excite/v2/account-summary-api/v1/summary/yearly',
		);

		expectMockResponse(result, { status: 500, statusText: 'Internal Server Error', body: '' });
	});

	it('applies a later setSnapshot call to subsequent requests immediately, with no request needing to wait', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		const firstResult = await interceptor('https://example.com/api/users');
		expectMockResponse(firstResult, { status: 200, statusText: 'OK', body: JSON.stringify(mockUsersGet.body) });
		expect(originalFetch).not.toHaveBeenCalled();

		// Live update: no page reload, no re-hold - the very next request should
		// reflect the new snapshot's rules synchronously.
		const disabledUsersGet: MockResponseItem = { ...mockUsersGet, enabled: false };
		ruleGate.setSnapshot(snapshotWith({ mockResponses: [disabledUsersGet] }));

		await interceptor('https://example.com/api/users');
		expect(originalFetch).toHaveBeenCalledWith('https://example.com/api/users', undefined);
	});

	it('passes through to the real network when interception is off, even if a mock would match', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith({ isRunning: false }));
		const originalFetch = createOriginalFetch();
		const interceptor = createFetchInterceptor({
			originalFetch,
			makeResponse,
			ruleGate,
			getBaseUrl: () => 'https://example.com',
		});

		await interceptor('https://example.com/api/users');

		expect(originalFetch).toHaveBeenCalledWith('https://example.com/api/users', undefined);
	});
});
