/**
 * MV3 service worker. Turns `mock-count` messages from the bridge, combined with redirect match
 * counts from `chrome.declarativeNetRequest.onRuleMatchedDebug`, into the extension's per-tab
 * toolbar badge, and keeps `chrome.declarativeNetRequest`'s dynamic rules in sync with the
 * popup's redirect rules.
 */
import { isMockCountMessage } from '../shared/messaging/validateMockCountMessage';
import {
	getRedirectCount,
	handleRuleMatched,
	handleTabRemoved,
	handleTabUpdated,
	isNavigationReset,
} from './redirectBadgeManager';
import { shouldResync, syncRedirectRules } from './syncRedirectRules';

const BADGE_BACKGROUND_COLOR = '#1976d2';

// Per-tab mock match counts, as last reported by the bridge's `mock-count` messages. Combined
// with `getRedirectCount` in `updateBadge` to produce the single badge total shown to the user.
const mockCounts = new Map<number, number>();

/**
 * Sets the toolbar badge for a tab to the sum of its mock and redirect match counts, following
 * the same "blank when zero" convention as before.
 *
 * @param tabId - The tab whose badge to update.
 */
const updateBadge = (tabId: number): void => {
	const total = (mockCounts.get(tabId) ?? 0) + getRedirectCount(tabId);
	chrome.action.setBadgeText({ tabId, text: total === 0 ? '' : String(total) });
	chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_BACKGROUND_COLOR });
};

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

	mockCounts.set(tabId, message.payload.count);
	updateBadge(tabId);
});

/**
 * Counts redirect matches as DNR enforces them, then refreshes the badge so it reflects the new
 * total immediately. Only fires in unpacked/dev-mode extensions — see `redirectBadgeManager`'s
 * doc comment for the accepted limitation in packed installs.
 */
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
	handleRuleMatched(info);
	if (info.request.tabId >= 0) {
		updateBadge(info.request.tabId);
	}
});

/**
 * Resets a tab's redirect count on navigation so a previous page's matches don't linger, and
 * refreshes the badge immediately to drop that portion. The mock-count half of the badge resets
 * naturally via the next `mock-count` message from the re-injected content script.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	handleTabUpdated(tabId, changeInfo);
	if (isNavigationReset(changeInfo)) {
		updateBadge(tabId);
	}
});

/**
 * Cleans up both per-tab count maps when a tab closes, so neither leaks across a long session.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
	handleTabRemoved(tabId);
	mockCounts.delete(tabId);
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
