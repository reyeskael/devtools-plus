export type AppPage = 'mock-api' | 'http-rules';

export function openApp(): void;
export function openApp(page: AppPage): void;
export function openApp(page?: AppPage): void {
	const baseUrl = chrome.runtime.getURL('src/app/index.html');
	const url = page ? `${baseUrl}#/${page}` : baseUrl;
	chrome.tabs.create({ url });
}
