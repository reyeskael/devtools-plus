import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';

export default defineManifest({
	manifest_version: 3,
	name: 'DevTools Plus',
	version: packageJson.version,
	description: packageJson.description,
	icons: {
		16: 'public/icons/icon16.png',
		32: 'public/icons/icon32.png',
		48: 'public/icons/icon48.png',
		128: 'public/icons/icon128.png',
	},
	action: {
		default_popup: 'src/popup/index.html',
		default_icon: {
			16: 'public/icons/icon16.png',
			32: 'public/icons/icon32.png',
			48: 'public/icons/icon48.png',
			128: 'public/icons/icon128.png',
		},
	},
	background: {
		service_worker: 'src/background/service-worker.ts',
		type: 'module',
	},
	permissions: ['storage', 'tabs'],
	host_permissions: ['<all_urls>'],
	content_scripts: [
		{
			js: ['src/content/bridge/index.ts'],
			matches: ['<all_urls>'],
			run_at: 'document_start',
		},
		{
			js: ['src/content/interceptor/index.ts'],
			matches: ['<all_urls>'],
			run_at: 'document_start',
			world: 'MAIN',
		},
	],
});
