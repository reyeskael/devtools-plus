import { toDnrRules } from '../shared/rules/toDnrRules';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../shared/storage/keys';
import type { MockResponseItem, PopupItem, RedirectRuleItem } from '../shared/items/types';

/**
 * The shape actually persisted at `chrome.storage.local[STORAGE_KEY]`. Fields are typed optional
 * since a pre-rename/missing-field stored blob may lack any of them (see the defaulting in
 * `syncRedirectRules` below).
 */
interface StoredPopupItemsState {
	mockResponses?: MockResponseItem[];
	redirects?: RedirectRuleItem[];
	isRunning?: boolean;
}

/**
 * Determines whether a `chrome.storage.onChanged` event should trigger a redirect-rule resync.
 *
 * @param changes - The changed keys from the storage event.
 * @param areaName - Which storage area changed.
 * @returns `true` when the change is in local storage and touches the popup items key.
 */
export const shouldResync = (
	changes: Record<string, chrome.storage.StorageChange>,
	areaName: chrome.storage.AreaName,
): boolean => areaName === 'local' && STORAGE_KEY in changes;

/**
 * Replaces the extension's dynamic DNR rules with `rules` in one atomic call, removing whatever
 * dynamic rules currently exist first so a shrinking rule set actually drops the stale ones.
 *
 * @param rules - The full desired dynamic rule set.
 */
const applyRules = async (rules: chrome.declarativeNetRequest.Rule[]): Promise<void> => {
	const existingRules = await new Promise<chrome.declarativeNetRequest.Rule[]>((resolve) => {
		chrome.declarativeNetRequest.getDynamicRules((rules) => resolve(rules));
	});
	const removeRuleIds = existingRules.map((rule) => rule.id);
	await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: rules });
};

/**
 * Reads the popup's persisted items and applies them as the extension's dynamic DNR rule set.
 * Does the actual work behind `syncRedirectRules`; split out so it can be chained onto
 * `syncTail` rather than run directly.
 */
const performSync = async (): Promise<void> => {
	const result = await new Promise<Record<string, unknown>>((resolve) => {
		chrome.storage.local.get(STORAGE_KEY, (items) => resolve(items));
	});
	const stored = result[STORAGE_KEY] as StoredPopupItemsState | undefined;
	const mockResponses = stored?.mockResponses ?? [];
	const redirects = stored?.redirects ?? [];
	// Mirrors the bridge's `EMPTY_SNAPSHOT` convention: an absent/incomplete stored blob
	// defaults to "running", so this doesn't disagree with what the popup is showing.
	const isRunning = stored?.isRunning ?? true;

	const items: PopupItem[] = [...mockResponses, ...redirects];
	await applyRules(toDnrRules(items, isRunning));
};

// Chains each sync onto the previous one so a new sync's `getDynamicRules` call only ever starts
// after the prior sync's `updateDynamicRules` call has settled. Without this, two syncs triggered
// back-to-back (e.g. rapid `chrome.storage.onChanged` events) could both read the same stale
// `getDynamicRules` snapshot and race to install conflicting rule sets.
let syncTail: Promise<void> = Promise.resolve();

/**
 * Reads the popup's persisted items, compiles them into DNR rules via `toDnrRules`, and applies
 * the result as the extension's dynamic rule set. Called once at module load and again on every
 * relevant `chrome.storage.onChanged` event, so the enforced rules stay in sync with whatever the
 * popup/app last wrote. Fire-and-forget: overlapping calls are serialized internally via
 * `syncTail`, and any failure (storage/DNR API rejection, or a synchronous throw from
 * `toDnrRules`) is caught and logged rather than left unhandled.
 */
export const syncRedirectRules = (): void => {
	syncTail = syncTail.then(performSync).catch((error) => {
		console.error('[devtools-plus] failed to sync redirect rules', error);
	});
};
