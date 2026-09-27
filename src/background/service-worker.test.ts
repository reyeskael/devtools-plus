import { buildMockCountMessage } from '../shared/messaging/buildMockCountMessage';
import { MESSAGE_SOURCE } from '../shared/messaging/types';
import type { MockCountMessage } from '../shared/messaging/types';

const BADGE_BACKGROUND_COLOR = '#1976d2';

type OnMessageListener = (
	message: unknown,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => void;

const getRegisteredListener = (): OnMessageListener => {
	const addListener = chrome.runtime.onMessage.addListener as jest.Mock;
	return addListener.mock.calls[0][0];
};

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
