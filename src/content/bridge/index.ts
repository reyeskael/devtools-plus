import { MESSAGE_SOURCE } from '../../shared/messaging/types';
import { buildMockCountMessage } from '../../shared/messaging/buildMockCountMessage';
import { isMockAppliedMessage } from '../../shared/messaging/validateMockAppliedMessage';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../../shared/storage/keys';
import type { RuleSnapshot, RulesSnapshotMessage } from '../../shared/messaging/types';

/**
 * Fallback snapshot posted when storage has nothing yet. `isRunning: true` mirrors
 * `usePopupItemsState`'s own pre-hydration default, so this doesn't disagree with what the
 * popup is showing.
 */
const EMPTY_SNAPSHOT: RuleSnapshot = {
	mockResponses: [],
	httpRules: [],
	isRunning: true,
};

/**
 * Wraps a stored rule snapshot (or its absence) in a `rules-snapshot` message for the
 * interceptor.
 *
 * @param stored - The snapshot read from `chrome.storage.local`, or `undefined` if unset.
 * @returns The message to post into the page. Falls back to {@link EMPTY_SNAPSHOT} when
 * `stored` is `undefined`, so posting *something* opens the interceptor's rule gate
 * immediately instead of waiting out its hold timeout.
 */
export const buildRulesSnapshotMessage = (stored: RuleSnapshot | undefined): RulesSnapshotMessage => ({
	source: MESSAGE_SOURCE,
	type: 'rules-snapshot',
	payload: stored ?? EMPTY_SNAPSHOT,
});

/**
 * Total mock-applied count for this page, reported to the background so it can set the
 * per-tab badge. Lives here rather than in the interceptor because the interceptor is
 * MAIN-world and re-injected per navigation; this module owns the running total for the
 * page's lifetime.
 */
let mockCount = 0;

/**
 * Determines whether a `chrome.storage.onChanged` event is relevant to the bridge.
 *
 * @param changes - The changed keys from the storage event.
 * @param areaName - Which storage area changed.
 * @returns `true` when the change is in local storage and touches the popup items key.
 */
export const shouldPostForChange = (
	changes: Record<string, chrome.storage.StorageChange>,
	areaName: chrome.storage.AreaName,
): boolean => areaName === 'local' && STORAGE_KEY in changes;

/**
 * Posts a rule snapshot into the page for the interceptor to pick up.
 *
 * @param stored - The snapshot to post, or `undefined` if storage has none yet.
 */
const postSnapshot = (stored: RuleSnapshot | undefined): void => {
	window.postMessage(buildRulesSnapshotMessage(stored), window.location.origin);
};

/**
 * Reads whatever is currently stored and posts it right away, then keeps posting a fresh
 * snapshot every time it changes. Also resets this page's badge count, since a stale count
 * from a previous page shouldn't linger after this script re-injects on navigation. Kept as
 * its own export so tests can trigger it directly against the stubbed chrome.storage APIs,
 * separate from the module-load call below.
 */
export const initBridge = (): void => {
	chrome.storage.local.get(STORAGE_KEY, (result) => {
		postSnapshot(result[STORAGE_KEY] as RuleSnapshot | undefined);
	});

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (!shouldPostForChange(changes, areaName)) {
			return;
		}
		postSnapshot(changes[STORAGE_KEY].newValue as RuleSnapshot | undefined);
	});

	chrome.runtime.sendMessage(buildMockCountMessage(0));
};

window.addEventListener('message', (event) => {
	if (event.source !== window) {
		return;
	}
	if (!isMockAppliedMessage(event.data)) {
		return;
	}
	mockCount += 1;
	chrome.runtime.sendMessage(buildMockCountMessage(mockCount));
});

initBridge();
