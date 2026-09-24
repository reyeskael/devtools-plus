export const openApp = (): void => {
	chrome.tabs.create({ url: chrome.runtime.getURL('src/app/index.html') });
};
