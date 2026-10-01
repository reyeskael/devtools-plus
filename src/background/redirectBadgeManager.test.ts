import type {
	getRedirectCount as GetRedirectCount,
	handleRuleMatched as HandleRuleMatched,
	handleTabRemoved as HandleTabRemoved,
	handleTabUpdated as HandleTabUpdated,
	isNavigationReset as IsNavigationReset,
} from './redirectBadgeManager';

/**
 * Builds a minimal `MatchedRuleInfoDebug`-shaped fixture. Only `request.tabId` matters to
 * `handleRuleMatched`; the rest of `RequestDetails` and `MatchedRule` are irrelevant to this
 * module's behavior, so this stays deliberately sparse and casts past the rest of the required
 * fields, consistent with how other background tests cast `sender`-shaped fixtures.
 */
const makeMatchedRuleInfo = (
	tabId: number,
): chrome.declarativeNetRequest.MatchedRuleInfoDebug =>
	({
		request: { tabId },
		rule: { ruleId: 1, rulesetId: '_dynamic' },
	}) as unknown as chrome.declarativeNetRequest.MatchedRuleInfoDebug;

describe('redirectBadgeManager', () => {
	let getRedirectCount: typeof GetRedirectCount;
	let handleRuleMatched: typeof HandleRuleMatched;
	let handleTabRemoved: typeof HandleTabRemoved;
	let handleTabUpdated: typeof HandleTabUpdated;
	let isNavigationReset: typeof IsNavigationReset;

	beforeEach(async () => {
		// Fresh module per test so the module-private `redirectCounts` map never leaks state
		// between test cases, mirroring the pattern in service-worker.test.ts.
		jest.resetModules();
		const mod = await import('./redirectBadgeManager');
		getRedirectCount = mod.getRedirectCount;
		handleRuleMatched = mod.handleRuleMatched;
		handleTabRemoved = mod.handleTabRemoved;
		handleTabUpdated = mod.handleTabUpdated;
		isNavigationReset = mod.isNavigationReset;
	});

	describe('getRedirectCount', () => {
		it('returns 0 for a tab with no recorded matches', () => {
			expect(getRedirectCount(1)).toBe(0);
		});
	});

	describe('handleRuleMatched', () => {
		it('increments the count for the matched request\'s tab', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));

			expect(getRedirectCount(1)).toBe(1);
		});

		it('accumulates multiple matches for the same tab', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(1));

			expect(getRedirectCount(1)).toBe(3);
		});

		it('tracks separate tabs independently', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(2));

			expect(getRedirectCount(1)).toBe(2);
			expect(getRedirectCount(2)).toBe(1);
		});

		it('ignores a match with tabId < 0 (no associated tab)', () => {
			handleRuleMatched(makeMatchedRuleInfo(-1));

			expect(getRedirectCount(-1)).toBe(0);
		});

		it('does not let a tabId < 0 match affect other tabs\' counts', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(-1));

			expect(getRedirectCount(1)).toBe(1);
		});
	});

	describe('isNavigationReset', () => {
		it('is true when changeInfo.url is set', () => {
			expect(isNavigationReset({ url: 'https://example.com' })).toBe(true);
		});

		it('is true when changeInfo.status is "loading"', () => {
			expect(isNavigationReset({ status: 'loading' })).toBe(true);
		});

		it('is false when changeInfo.status is "complete" and no url is present', () => {
			expect(isNavigationReset({ status: 'complete' })).toBe(false);
		});

		it('is false for an empty changeInfo', () => {
			expect(isNavigationReset({})).toBe(false);
		});
	});

	describe('handleTabUpdated', () => {
		it('resets the tab\'s count when changeInfo represents a navigation reset (url set)', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			expect(getRedirectCount(1)).toBe(1);

			handleTabUpdated(1, { url: 'https://example.com' });

			expect(getRedirectCount(1)).toBe(0);
		});

		it('resets the tab\'s count when changeInfo represents a navigation reset (status loading)', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			expect(getRedirectCount(1)).toBe(1);

			handleTabUpdated(1, { status: 'loading' });

			expect(getRedirectCount(1)).toBe(0);
		});

		it('leaves the count untouched when changeInfo is not a navigation reset', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			expect(getRedirectCount(1)).toBe(1);

			handleTabUpdated(1, { status: 'complete' });

			expect(getRedirectCount(1)).toBe(1);
		});

		it('only resets the targeted tab, leaving other tabs\' counts untouched', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(2));

			handleTabUpdated(1, { url: 'https://example.com' });

			expect(getRedirectCount(1)).toBe(0);
			expect(getRedirectCount(2)).toBe(1);
		});
	});

	describe('handleTabRemoved', () => {
		it('deletes the tab\'s redirect count entirely', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			expect(getRedirectCount(1)).toBe(1);

			handleTabRemoved(1);

			expect(getRedirectCount(1)).toBe(0);
		});

		it('does not affect other tabs\' entries', () => {
			handleRuleMatched(makeMatchedRuleInfo(1));
			handleRuleMatched(makeMatchedRuleInfo(2));

			handleTabRemoved(1);

			expect(getRedirectCount(1)).toBe(0);
			expect(getRedirectCount(2)).toBe(1);
		});
	});
});
