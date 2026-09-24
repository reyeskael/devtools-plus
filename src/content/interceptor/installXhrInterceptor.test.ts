import { installXhrInterceptor } from './installXhrInterceptor';
import { createRuleGate, HOLD_TIMEOUT_MS } from './ruleGate';
import { seedMockResponses } from '../../shared/items/seedItems';
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

const waitForLoad = (xhr: XMLHttpRequest): Promise<void> =>
	new Promise((resolve) => xhr.addEventListener('load', () => resolve()));

describe('installXhrInterceptor', () => {
	let teardown: (() => void) | undefined;

	afterEach(() => {
		teardown?.();
		teardown = undefined;
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('holds a request until a snapshot arrives, then serves a matching mock', async () => {
		jest.useFakeTimers();
		const ruleGate = createRuleGate();
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://example.com/api/users');
		xhr.send();

		expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);

		const loaded = waitForLoad(xhr);
		ruleGate.setSnapshot(snapshotWith());
		await loaded;

		expect(xhr.status).toBe(200);
		expect(xhr.statusText).toBe('OK');
		expect(xhr.responseText).toBe(JSON.stringify(mockUsersGet.body));
	});

	it('holds a request until a snapshot arrives, then passes through when nothing matches', async () => {
		jest.useFakeTimers();
		const sendSpy = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
		const ruleGate = createRuleGate();
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://example.com/api/orders');
		xhr.send();

		expect(sendSpy).not.toHaveBeenCalled();

		ruleGate.setSnapshot(snapshotWith());
		await Promise.resolve();
		await Promise.resolve();

		expect(sendSpy).toHaveBeenCalledTimes(1);
	});

	it('releases held requests to the real network once the hold times out', async () => {
		jest.useFakeTimers();
		const sendSpy = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
		const ruleGate = createRuleGate();
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://example.com/api/users');
		xhr.send();

		jest.advanceTimersByTime(HOLD_TIMEOUT_MS);
		await Promise.resolve();
		await Promise.resolve();

		expect(sendSpy).toHaveBeenCalledTimes(1);
	});

	it('passes through the exact send() arguments when nothing matches', async () => {
		const sendSpy = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://example.com/api/orders');
		xhr.send('request-body');

		expect(sendSpy).toHaveBeenCalledWith('request-body');
	});

	it('serves the bodyless 404 sample entry with an empty body', async () => {
		const item404 = { ...findById('mock-yearly-summary-404'), enabled: true };
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith({ mockResponses: [item404] }));
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		const loaded = waitForLoad(xhr);
		xhr.open('GET', 'https://example.com/api/excite/v2/account-summary-api/v1/summary/yearly');
		xhr.send();
		await loaded;

		expect(xhr.status).toBe(404);
		expect(xhr.statusText).toBe('Not Found');
		expect(xhr.responseText).toBe('');
	});

	it('serves the bodyless 500 sample entry with an empty body', async () => {
		const item500 = { ...findById('mock-yearly-summary-500'), enabled: true };
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith({ mockResponses: [item500] }));
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		const loaded = waitForLoad(xhr);
		xhr.open('GET', 'https://example.com/api/excite/v2/account-summary-api/v1/summary/yearly');
		xhr.send();
		await loaded;

		expect(xhr.status).toBe(500);
		expect(xhr.statusText).toBe('Internal Server Error');
		expect(xhr.responseText).toBe('');
	});

	it('applies a later setSnapshot call to subsequent requests immediately, with no request needing to wait', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const firstXhr = new XMLHttpRequest();
		const firstLoaded = waitForLoad(firstXhr);
		firstXhr.open('GET', 'https://example.com/api/users');
		firstXhr.send();
		await firstLoaded;

		expect(firstXhr.status).toBe(200);
		expect(firstXhr.responseText).toBe(JSON.stringify(mockUsersGet.body));

		// Live update: no page reload, no re-hold - the very next request should
		// reflect the new snapshot's rules synchronously.
		const sendSpy = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
		const disabledUsersGet: MockResponseItem = { ...mockUsersGet, enabled: false };
		ruleGate.setSnapshot(snapshotWith({ mockResponses: [disabledUsersGet] }));

		const secondXhr = new XMLHttpRequest();
		secondXhr.open('GET', 'https://example.com/api/users');
		secondXhr.send();
		await Promise.resolve();
		await Promise.resolve();

		expect(sendSpy).toHaveBeenCalledTimes(1);
	});

	it('passes through to the real network when interception is off, even if a mock would match', async () => {
		const sendSpy = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith({ isRunning: false }));
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://example.com/api/users');
		xhr.send();

		expect(sendSpy).toHaveBeenCalledTimes(1);
	});

	it('parses the mocked response as JSON when responseType is "json"', async () => {
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://example.com/api/users');
		xhr.responseType = 'json';
		const loaded = waitForLoad(xhr);
		xhr.send();
		await loaded;

		expect(xhr.response).toEqual(mockUsersGet.body);
		expect(xhr.responseText).toBe(JSON.stringify(mockUsersGet.body));
	});

	it('stops reporting a stale mocked response after the instance is reused for a new open()', async () => {
		const sendSpy = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
		const ruleGate = createRuleGate();
		ruleGate.setSnapshot(snapshotWith());
		teardown = installXhrInterceptor(ruleGate, () => 'https://example.com');

		const xhr = new XMLHttpRequest();
		const loaded = waitForLoad(xhr);
		xhr.open('GET', 'https://example.com/api/users');
		xhr.send();
		await loaded;

		expect(xhr.status).toBe(200);
		expect(xhr.readyState).toBe(4);

		// Reuse the same instance for a second, unmocked request.
		xhr.open('GET', 'https://example.com/api/orders');

		expect(xhr.status).toBe(0);
		expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);

		xhr.send();

		expect(sendSpy).toHaveBeenCalledTimes(1);
	});

	it('restores the original open and send after teardown', () => {
		const originalOpen = XMLHttpRequest.prototype.open;
		const originalSend = XMLHttpRequest.prototype.send;
		const ruleGate = createRuleGate();

		const restore = installXhrInterceptor(ruleGate, () => 'https://example.com');
		expect(XMLHttpRequest.prototype.open).not.toBe(originalOpen);
		expect(XMLHttpRequest.prototype.send).not.toBe(originalSend);

		restore();

		expect(XMLHttpRequest.prototype.open).toBe(originalOpen);
		expect(XMLHttpRequest.prototype.send).toBe(originalSend);
	});
});
