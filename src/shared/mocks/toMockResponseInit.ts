import type { MockResponseItem } from '../items/types';

export interface MockResponseInit {
	status: number;
	statusText: string;
	body: string;
}

export const toMockResponseInit = (item: MockResponseItem): MockResponseInit => ({
	status: item.statusCode,
	statusText: item.statusText ?? '',
	body: item.body === undefined ? '' : (JSON.stringify(item.body) ?? ''),
});
