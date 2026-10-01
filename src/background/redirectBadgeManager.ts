/**
 * Per-tab redirect match counting, kept separate from the mock-count badge logic in
 * `service-worker.ts`. Counts are driven by `chrome.declarativeNetRequest.onRuleMatchedDebug`
 * and reset on navigation/tab removal, mirroring how the mock count naturally resets when the
 * content scripts re-inject at `document_start`.
 *
 * Known limitation: `onRuleMatchedDebug` only fires for unpacked/dev-mode extensions, per Chrome's
 * own restriction on that event. In a packed Web Store install this manager never receives match
 * events, so the combined badge would still count mocks correctly but always report 0 redirects.
 * This is accepted and intentionally not worked around (see Q11/D14 in
 * REDIRECT-REQUEST/logs/decision-log.md).
 */

const redirectCounts = new Map<number, number>();

/**
 * Returns the current redirect match count for a tab, or 0 if it has none recorded.
 *
 * @param tabId - The tab to look up.
 * @returns The tab's redirect match count.
 */
export const getRedirectCount = (tabId: number): number => redirectCounts.get(tabId) ?? 0;

/**
 * Increments the redirect match count for the tab a matched DNR rule's request belongs to.
 * `tabId` is -1 for requests with no associated tab (e.g. not initiated by a tab), which is
 * ignored since there's nothing to badge.
 *
 * @param info - The matched rule info passed by `chrome.declarativeNetRequest.onRuleMatchedDebug`.
 */
export const handleRuleMatched = (info: chrome.declarativeNetRequest.MatchedRuleInfoDebug): void => {
	const { tabId } = info.request;
	if (tabId < 0) {
		return;
	}
	redirectCounts.set(tabId, getRedirectCount(tabId) + 1);
};

/**
 * Pure predicate for whether a `chrome.tabs.onUpdated` change represents a navigation that should
 * reset a tab's redirect count — a new URL, or the tab entering a fresh loading state.
 *
 * @param changeInfo - The change info passed by `chrome.tabs.onUpdated`.
 * @returns Whether this change represents a navigation reset.
 */
export const isNavigationReset = (changeInfo: chrome.tabs.OnUpdatedInfo): boolean =>
	changeInfo.url !== undefined || changeInfo.status === 'loading';

/**
 * Resets a tab's redirect count when `changeInfo` represents a navigation, so a previous page's
 * redirect matches don't linger into the next one.
 *
 * @param tabId - The tab that changed.
 * @param changeInfo - The change info passed by `chrome.tabs.onUpdated`.
 */
export const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo): void => {
	if (isNavigationReset(changeInfo)) {
		redirectCounts.delete(tabId);
	}
};

/**
 * Deletes a closed tab's redirect count entirely, so the map doesn't leak across a long session.
 *
 * @param tabId - The tab that was closed.
 */
export const handleTabRemoved = (tabId: number): void => {
	redirectCounts.delete(tabId);
};
