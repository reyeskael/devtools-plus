/**
 * MV3 service worker. Its sole job today is turning `mock-count` messages from the bridge
 * into the extension's per-tab toolbar badge.
 */
import { isMockCountMessage } from '../shared/messaging/validateMockCountMessage';

const BADGE_BACKGROUND_COLOR = '#1976d2';

chrome.runtime.onInstalled.addListener(() => {
	console.log('[devtools-plus] background service worker installed');
});

chrome.runtime.onMessage.addListener((message, sender) => {
	if (!isMockCountMessage(message)) {
		return;
	}
	const tabId = sender.tab?.id;
	if (tabId === undefined) {
		return;
	}

	const { count } = message.payload;
	chrome.action.setBadgeText({ tabId, text: count === 0 ? '' : String(count) });
	chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_BACKGROUND_COLOR });
});
