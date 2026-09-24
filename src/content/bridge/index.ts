import { MESSAGE_SOURCE } from '../../shared/messaging/types';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../../shared/storage/keys';
import type { RuleSnapshot, RulesSnapshotMessage } from '../../shared/messaging/types';

// The popup hasn't hydrated/persisted anything yet. `isRunning: true` mirrors
// usePopupItemsState's own pre-hydration default, so the snapshot posted here
// doesn't disagree with what the popup is showing. The point of this snapshot
// isn't its values — it's that posting *something* opens the interceptor's
// rule gate immediately instead of waiting out its 1s timeout.
const EMPTY_SNAPSHOT: RuleSnapshot = {
	mockResponses: [],
	httpRules: [],
	isRunning: true,
};

export const buildRulesSnapshotMessage = (stored: RuleSnapshot | undefined): RulesSnapshotMessage => ({
	source: MESSAGE_SOURCE,
	type: 'rules-snapshot',
	payload: stored ?? EMPTY_SNAPSHOT,
});

export const shouldPostForChange = (
	changes: Record<string, chrome.storage.StorageChange>,
	areaName: chrome.storage.AreaName,
): boolean => areaName === 'local' && STORAGE_KEY in changes;

const postSnapshot = (stored: RuleSnapshot | undefined): void => {
	window.postMessage(buildRulesSnapshotMessage(stored), window.location.origin);
};

// Reads whatever is currently stored and posts it right away, then keeps
// posting a fresh snapshot every time it changes. Kept as its own export so
// tests can trigger it directly against the stubbed chrome.storage APIs,
// separate from the module-load call below.
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
};

initBridge();
