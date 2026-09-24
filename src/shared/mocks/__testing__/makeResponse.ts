import type { MockResponseInit } from '../toMockResponseInit';

export interface FakeResponse {
	status: number;
	statusText: string;
	body: string;
	ok: boolean;
	text: () => Promise<string>;
	json: () => Promise<unknown>;
}

export const makeResponse = (init: MockResponseInit): FakeResponse => ({
	status: init.status,
	statusText: init.statusText,
	body: init.body,
	ok: init.status >= 200 && init.status < 300,
	text: () => Promise.resolve(init.body),
	json: async () => (init.body === '' ? undefined : JSON.parse(init.body)),
});
