import { buildRulesSnapshotMessage, initBridge, shouldPostForChange } from './index';
import { MESSAGE_SOURCE } from '../../shared/messaging/types';
import { isRulesSnapshotMessage } from '../../shared/messaging/validateRulesSnapshotMessage';
import { POPUP_ITEMS_STORAGE_KEY as STORAGE_KEY } from '../../shared/storage/keys';
import type { RuleSnapshot, RulesSnapshotMessage } from '../../shared/messaging/types';

const snapshot: RuleSnapshot = {
	mockResponses: [],
	httpRules: [],
	isRunning: false,
};

const emptySnapshot: RuleSnapshot = {
	mockResponses: [],
	httpRules: [],
	isRunning: true,
};

// Distinct from `emptySnapshot`'s fallback default of `isRunning: true` — this
// is a *real stored* snapshot that happens to share the same boolean value,
// plus non-empty arrays, so a bug that silently swapped in the empty-snapshot
// fallback (or coerced/defaulted `isRunning`) wouldn't slip past unnoticed.
const runningSnapshot: RuleSnapshot = {
	mockResponses: [
		{
			id: 'mock-1',
			name: 'Users list',
			kind: 'mock-response',
			enabled: true,
			method: 'GET',
			urlPattern: '/api/users',
			statusCode: 200,
			statusText: 'OK',
			body: {},
		},
	],
	httpRules: [],
	isRunning: true,
};

describe('buildRulesSnapshotMessage', () => {
	it('wraps a stored snapshot in a well-formed rules-snapshot message', () => {
		const message = buildRulesSnapshotMessage(snapshot);

		expect(message).toEqual({
			source: MESSAGE_SOURCE,
			type: 'rules-snapshot',
			payload: snapshot,
		});
		expect(isRulesSnapshotMessage(message)).toBe(true);
	});

	it('falls back to a well-formed empty snapshot when nothing is stored', () => {
		const message = buildRulesSnapshotMessage(undefined);

		expect(message.payload).toEqual(emptySnapshot);
		expect(isRulesSnapshotMessage(message)).toBe(true);
	});

	it('reflects a stored snapshot with isRunning: true and non-empty rules without falling back to the empty default', () => {
		const message = buildRulesSnapshotMessage(runningSnapshot);

		expect(message.payload).toEqual(runningSnapshot);
		expect(message.payload).not.toBe(emptySnapshot);
		expect(isRulesSnapshotMessage(message)).toBe(true);
	});
});

describe('shouldPostForChange', () => {
	it('reacts to a change of the popup storage key in the local area', () => {
		expect(shouldPostForChange({ [STORAGE_KEY]: { newValue: snapshot } }, 'local')).toBe(true);
	});

	it('ignores changes to an unrelated key', () => {
		expect(shouldPostForChange({ someOtherKey: { newValue: 1 } }, 'local')).toBe(false);
	});

	it('reacts to the popup storage key even when unrelated keys change in the same event', () => {
		expect(
			shouldPostForChange(
				{ someOtherKey: { newValue: 1 }, [STORAGE_KEY]: { newValue: snapshot } },
				'local',
			),
		).toBe(true);
	});

	it('ignores changes outside the local storage area', () => {
		expect(shouldPostForChange({ [STORAGE_KEY]: { newValue: snapshot } }, 'sync')).toBe(false);
	});

	it('ignores the right key in the managed storage area', () => {
		expect(shouldPostForChange({ [STORAGE_KEY]: { newValue: snapshot } }, 'managed')).toBe(false);
	});

	it('ignores the right key in the session storage area', () => {
		expect(shouldPostForChange({ [STORAGE_KEY]: { newValue: snapshot } }, 'session')).toBe(false);
	});
});

describe('initBridge', () => {
	// jest.setup.ts clears the chrome.storage.onChanged.addListener mock before
	// each test, so this is always the listener registered by the initBridge()
	// call inside the current test, not a leftover from a previous one.
	const getOnChangedListener = (): ((
		changes: Record<string, chrome.storage.StorageChange>,
		areaName: chrome.storage.AreaName,
	) => void) => {
		const addListener = chrome.storage.onChanged.addListener as jest.Mock;
		return addListener.mock.calls[0][0];
	};

	it('posts a snapshot built from stored state as soon as it runs', () => {
		chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
		const postMessageSpy = jest.spyOn(window, 'postMessage');

		initBridge();

		expect(postMessageSpy).toHaveBeenCalledWith(
			{ source: MESSAGE_SOURCE, type: 'rules-snapshot', payload: snapshot },
			window.location.origin,
		);
		const [message, targetOrigin] = postMessageSpy.mock.calls[0];
		expect(isRulesSnapshotMessage(message)).toBe(true);
		expect(targetOrigin).toBe(window.location.origin);
		expect(targetOrigin).not.toBe('*');
	});

	it('posts a well-formed empty snapshot when nothing is stored yet', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');

		initBridge();

		const [message] = postMessageSpy.mock.calls[0];
		expect(isRulesSnapshotMessage(message)).toBe(true);
		expect((message as RulesSnapshotMessage).payload).toEqual(emptySnapshot);
	});

	it('posts a fresh snapshot when the popup storage key changes in the local area', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged({ [STORAGE_KEY]: { newValue: snapshot } }, 'local');

		expect(postMessageSpy).toHaveBeenCalledWith(
			{ source: MESSAGE_SOURCE, type: 'rules-snapshot', payload: snapshot },
			window.location.origin,
		);
		const [message, targetOrigin] = postMessageSpy.mock.calls[0];
		expect(isRulesSnapshotMessage(message)).toBe(true);
		expect(targetOrigin).toBe(window.location.origin);
	});

	it('posts a fresh snapshot reflecting the new value even when unrelated keys change in the same event', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged(
			{ someOtherKey: { newValue: 1 }, [STORAGE_KEY]: { newValue: runningSnapshot } },
			'local',
		);

		const [message] = postMessageSpy.mock.calls[0];
		expect(isRulesSnapshotMessage(message)).toBe(true);
		expect((message as RulesSnapshotMessage).payload).toEqual(runningSnapshot);
	});

	it('ignores an onChanged event for a different key', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged({ someOtherKey: { newValue: 1 } }, 'local');

		expect(postMessageSpy).not.toHaveBeenCalled();
	});

	it('ignores an onChanged event from a different storage area', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged({ [STORAGE_KEY]: { newValue: snapshot } }, 'sync');

		expect(postMessageSpy).not.toHaveBeenCalled();
	});

	it('posts a well-formed empty snapshot when the popup storage key is removed', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged({ [STORAGE_KEY]: { newValue: undefined } }, 'local');

		const [message] = postMessageSpy.mock.calls[0];
		expect(isRulesSnapshotMessage(message)).toBe(true);
		expect((message as RulesSnapshotMessage).payload).toEqual(emptySnapshot);
	});

	it('ignores an onChanged event for the right key in the managed storage area', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged({ [STORAGE_KEY]: { newValue: snapshot } }, 'managed');

		expect(postMessageSpy).not.toHaveBeenCalled();
	});

	it('ignores an onChanged event for the right key in the session storage area', () => {
		const postMessageSpy = jest.spyOn(window, 'postMessage');
		initBridge();
		const onChanged = getOnChangedListener();
		postMessageSpy.mockClear();

		onChanged({ [STORAGE_KEY]: { newValue: snapshot } }, 'session');

		expect(postMessageSpy).not.toHaveBeenCalled();
	});

	// Documents current behavior rather than asserting a requirement: initBridge
	// has no idempotency guard, so calling it more than once (e.g. if the module
	// were evaluated twice in one page context) registers an additional
	// onChanged listener each time. Each registered listener independently posts
	// a snapshot, so a single storage change would be posted once per
	// registration. In production this content script is injected once per
	// frame per the manifest's single `content_scripts` entry, so this isn't
	// known to be reachable today — flagged here so it stays visible if that
	// assumption ever changes.
	it('registers an additional onChanged listener each time it is called, with no de-duplication', () => {
		const addListener = chrome.storage.onChanged.addListener as jest.Mock;

		initBridge();
		initBridge();

		expect(addListener).toHaveBeenCalledTimes(2);

		const postMessageSpy = jest.spyOn(window, 'postMessage');
		postMessageSpy.mockClear();
		const [firstListener] = addListener.mock.calls[0];
		const [secondListener] = addListener.mock.calls[1];

		firstListener({ [STORAGE_KEY]: { newValue: snapshot } }, 'local');
		secondListener({ [STORAGE_KEY]: { newValue: snapshot } }, 'local');

		expect(postMessageSpy).toHaveBeenCalledTimes(2);
	});
});
