import { buildMockCountMessage } from '../shared/messaging/buildMockCountMessage';
import { MESSAGE_SOURCE } from '../shared/messaging/types';
import type { MockCountMessage } from '../shared/messaging/types';

const BADGE_BACKGROUND_COLOR = '#1976d2';

type OnMessageListener = (
	message: unknown,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => void;

type OnRuleMatchedDebugListener = (
	info: chrome.declarativeNetRequest.MatchedRuleInfoDebug,
) => void;

type OnTabsUpdatedListener = (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo) => void;

type OnTabsRemovedListener = (tabId: number) => void;

const getRegisteredListener = (): OnMessageListener => {
	const addListener = chrome.runtime.onMessage.addListener as jest.Mock;
	return addListener.mock.calls[0][0];
};

const getRegisteredRuleMatchedListener = (): OnRuleMatchedDebugListener => {
	const addListener = chrome.declarativeNetRequest.onRuleMatchedDebug
		.addListener as jest.Mock;
	return addListener.mock.calls[0][0];
};

const getRegisteredTabsUpdatedListener = (): OnTabsUpdatedListener => {
	const addListener = chrome.tabs.onUpdated.addListener as jest.Mock;
	return addListener.mock.calls[0][0];
};

const getRegisteredTabsRemovedListener = (): OnTabsRemovedListener => {
	const addListener = chrome.tabs.onRemoved.addListener as jest.Mock;
	return addListener.mock.calls[0][0];
};

/**
 * Builds a minimal `MatchedRuleInfoDebug`-shaped fixture. Only `request.tabId` is read by the
 * code under test; the rest of `RequestDetails`/`MatchedRule` is irrelevant here.
 */
const makeMatchedRuleInfo = (
	tabId: number,
): chrome.declarativeNetRequest.MatchedRuleInfoDebug =>
	({
		request: { tabId },
		rule: { ruleId: 1, rulesetId: '_dynamic' },
	}) as unknown as chrome.declarativeNetRequest.MatchedRuleInfoDebug;

const noopSendResponse = (): void => {};

describe('background service worker: mock-count -> badge', () => {
	beforeEach(async () => {
		// Fresh module per test: the listener closes over nothing stateful, but
		// re-importing guarantees a listener is registered on
		// chrome.runtime.onMessage for this test, independent of any other test
		// file's side effects.
		jest.resetModules();
		await import('./service-worker');
	});

	it('registers exactly one onMessage listener on module load', () => {
		const addListener = chrome.runtime.onMessage.addListener as jest.Mock;
		expect(addListener).toHaveBeenCalledTimes(1);
	});

	it('sets the badge text to the stringified count and the badge background color for a nonzero count', () => {
		const listener = getRegisteredListener();
		const message = buildMockCountMessage(3);

		listener(message, { tab: { id: 42 } } as chrome.runtime.MessageSender, noopSendResponse);

		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 42, text: '3' });
		expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
			tabId: 42,
			color: BADGE_BACKGROUND_COLOR,
		});
	});

	it('sets the badge text to an empty string for a count of 0', () => {
		const listener = getRegisteredListener();
		const message = buildMockCountMessage(0);

		listener(message, { tab: { id: 7 } } as chrome.runtime.MessageSender, noopSendResponse);

		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '' });
		expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
			tabId: 7,
			color: BADGE_BACKGROUND_COLOR,
		});
	});

	it('derives tabId strictly from sender.tab.id, ignoring any tabId-shaped field forged into the payload', () => {
		const listener = getRegisteredListener();
		const validMessage = buildMockCountMessage(3);
		const forgedMessage = {
			...validMessage,
			payload: { ...validMessage.payload, tabId: 999 },
		};

		listener(
			forgedMessage,
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);

		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 42, text: '3' });
		expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith(
			expect.objectContaining({ tabId: 42 }),
		);
		expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith(
			expect.objectContaining({ tabId: 999 }),
		);
	});

	it('no-ops when sender.tab?.id is undefined', () => {
		const listener = getRegisteredListener();
		const message = buildMockCountMessage(3);

		listener(message, {} as chrome.runtime.MessageSender, noopSendResponse);
		listener(message, { tab: {} } as chrome.runtime.MessageSender, noopSendResponse);

		expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
		expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
	});

	it('ignores messages that fail isMockCountMessage', () => {
		const listener = getRegisteredListener();
		const sender = { tab: { id: 42 } } as chrome.runtime.MessageSender;

		listener(undefined, sender, noopSendResponse);
		listener(null, sender, noopSendResponse);
		listener('not-a-message', sender, noopSendResponse);
		listener({ source: MESSAGE_SOURCE, type: 'mock-applied' }, sender, noopSendResponse);
		listener(
			{ source: MESSAGE_SOURCE, type: 'mock-count', payload: { count: 'not-a-number' } },
			sender,
			noopSendResponse,
		);
		listener(
			{
				source: 'some-other-extension',
				type: 'mock-count',
				payload: { count: 1 },
			} as unknown as MockCountMessage,
			sender,
			noopSendResponse,
		);

		expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
		expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
	});
});

describe('background service worker: redirect matches -> combined badge', () => {
	beforeEach(async () => {
		// Fresh module per test: both `mockCounts` (service-worker.ts) and `redirectCounts`
		// (redirectBadgeManager.ts) are module-private state that must not leak across tests.
		jest.resetModules();
		await import('./service-worker');
	});

	it('registers exactly one listener on each of onRuleMatchedDebug, tabs.onUpdated, and tabs.onRemoved', () => {
		expect(
			(chrome.declarativeNetRequest.onRuleMatchedDebug.addListener as jest.Mock).mock.calls
				.length,
		).toBe(1);
		expect((chrome.tabs.onUpdated.addListener as jest.Mock).mock.calls.length).toBe(1);
		expect((chrome.tabs.onRemoved.addListener as jest.Mock).mock.calls.length).toBe(1);
	});

	it('sets the badge to the redirect count alone when only a rule match has been seen (no mock-count message yet)', () => {
		const ruleMatched = getRegisteredRuleMatchedListener();

		ruleMatched(makeMatchedRuleInfo(42));

		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 42, text: '1' });
		expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
			tabId: 42,
			color: BADGE_BACKGROUND_COLOR,
		});
	});

	it('sums a prior mock-count message with a subsequent redirect match', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();

		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);
		ruleMatched(makeMatchedRuleInfo(42));

		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '3' });
	});

	it('sums a redirect match that arrives before a mock-count message', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();

		ruleMatched(makeMatchedRuleInfo(42));
		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);

		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '3' });
	});

	it('accumulates multiple redirect matches on top of an existing mock count', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();

		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);
		ruleMatched(makeMatchedRuleInfo(42));
		ruleMatched(makeMatchedRuleInfo(42));
		ruleMatched(makeMatchedRuleInfo(42));

		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '5' });
	});

	it('does not update the badge for a rule match whose request has no associated tab (tabId < 0)', () => {
		const ruleMatched = getRegisteredRuleMatchedListener();

		ruleMatched(makeMatchedRuleInfo(-1));

		expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
		expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
	});

	it('a navigation-reset tabs.onUpdated (url set) drops the redirect portion, leaving only the mock count', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();
		const tabsUpdated = getRegisteredTabsUpdatedListener();

		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);
		ruleMatched(makeMatchedRuleInfo(42));
		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '3' });

		tabsUpdated(42, { url: 'https://example.com' });

		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '2' });
	});

	it('a navigation-reset tabs.onUpdated (status: "loading") drops the redirect portion, leaving only the mock count', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();
		const tabsUpdated = getRegisteredTabsUpdatedListener();

		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);
		ruleMatched(makeMatchedRuleInfo(42));
		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '3' });

		tabsUpdated(42, { status: 'loading' });

		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '2' });
	});

	it('a non-reset tabs.onUpdated (status: "complete" alone) does not touch the badge', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();
		const tabsUpdated = getRegisteredTabsUpdatedListener();

		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);
		ruleMatched(makeMatchedRuleInfo(42));
		(chrome.action.setBadgeText as jest.Mock).mockClear();
		(chrome.action.setBadgeBackgroundColor as jest.Mock).mockClear();

		tabsUpdated(42, { status: 'complete' });

		expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
		expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
	});

	it('tabs.onRemoved cleans up both the mock count and redirect count for that tab', () => {
		const mockCountListener = getRegisteredListener();
		const ruleMatched = getRegisteredRuleMatchedListener();
		const tabsRemoved = getRegisteredTabsRemovedListener();

		mockCountListener(
			buildMockCountMessage(2),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);
		ruleMatched(makeMatchedRuleInfo(42));
		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '3' });

		tabsRemoved(42);

		// tabs.onRemoved itself doesn't refresh the badge (no tab left to badge), but a
		// subsequent mock-count message for the same tabId proves both maps were cleared: if
		// either count had survived, the total would be greater than the freshly reported 1.
		mockCountListener(
			buildMockCountMessage(1),
			{ tab: { id: 42 } } as chrome.runtime.MessageSender,
			noopSendResponse,
		);

		expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42, text: '1' });
	});
});
