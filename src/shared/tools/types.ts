export type ToolIconKey =
	'network' | 'console' | 'storage' | 'performance' | 'accessibility' | 'security';

export interface Tool {
	id: string;
	name: string;
	icon: ToolIconKey;
	enabled: boolean;
	pinned: boolean;
}
