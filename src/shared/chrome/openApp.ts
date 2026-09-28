export type AppPage = 'mock-api' | 'http-rules';

/**
 * Opens the full-page app in a new tab, optionally deep-linked to a page via a URL hash route.
 *
 * @param page - The app page to deep-link to. Omit to open the app's default route.
 */
export const openApp = (page?: AppPage): void => {
	const baseUrl = chrome.runtime.getURL('src/app/index.html');
	const url = page ? `${baseUrl}#/${page}` : baseUrl;
	chrome.tabs.create({ url });
};
