/**
 * MV3 service worker. Turns `mock-count` messages from the bridge into the extension's per-tab
 * toolbar badge, and keeps `chrome.declarativeNetRequest`'s dynamic rules in sync with the
 * popup's redirect rules.
 */
import { isMockCountMessage } from '../shared/messaging/validateMockCountMessage';
import { shouldResync, syncRedirectRules } from './syncRedirectRules';

const BADGE_BACKGROUND_COLOR = '#1976d2';

/**
 * Logs a marker for install/update so the service worker's presence is visible in the
 * `chrome://extensions` service worker console, since MV3 workers have no persistent UI of
 * their own to confirm they're alive.
 */
chrome.runtime.onInstalled.addListener(() => {
	console.log('[devtools-plus] background service worker installed');
});

/**
 * Handles `mock-count` messages from the bridge, ignoring anything else that comes through
 * `chrome.runtime.onMessage`. `sender.tab` is only present for messages from a content
 * script, so a missing tab id means there's no badge to update.
 */
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

/**
 * Keeps enforced redirect rules in sync with the popup's stored items: once at module load
 * (since the service worker can wake up without a fresh install/update event, e.g. after being
 * suspended) and again on every storage change that touches the popup's items.
 */
syncRedirectRules();

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (!shouldResync(changes, areaName)) {
		return;
	}
	syncRedirectRules();
});
