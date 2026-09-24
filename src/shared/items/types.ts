interface PopupItemBase {
	id: string;
	name: string;
	enabled: boolean;
}

export interface MockResponseItem extends PopupItemBase {
	kind: 'mock-response';
	method: string;
	urlPattern: string;
	statusCode: number;
	body?: string;
}

export interface HttpRuleItem extends PopupItemBase {
	kind: 'http-rule';
	urlPattern: string;
	action: 'block' | 'redirect' | 'modify-headers';
	target?: string;
}

export type PopupItem = MockResponseItem | HttpRuleItem;
