import type { Tool } from './types';

// TODO: placeholder tool catalogue — replace with the real devtools-plus tool list once defined.
export const mockTools: Tool[] = [
	{
		id: 'network-inspector',
		name: 'Network Inspector',
		icon: 'network',
		enabled: true,
		pinned: true,
	},
	{ id: 'console-logger', name: 'Console Logger', icon: 'console', enabled: true, pinned: false },
	{
		id: 'storage-viewer',
		name: 'Storage Viewer',
		icon: 'storage',
		enabled: false,
		pinned: false,
	},
	{
		id: 'performance-monitor',
		name: 'Performance Monitor',
		icon: 'performance',
		enabled: true,
		pinned: false,
	},
	{
		id: 'accessibility-checker',
		name: 'Accessibility Checker',
		icon: 'accessibility',
		enabled: false,
		pinned: true,
	},
	{
		id: 'security-scanner',
		name: 'Security Scanner',
		icon: 'security',
		enabled: true,
		pinned: false,
	},
];
