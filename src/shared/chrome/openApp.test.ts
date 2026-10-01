import { openApp } from './openApp';

describe('openApp', () => {
	it('opens the base app URL with no hash when called with no arguments', () => {
		openApp();

		expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'src/app/index.html' });
	});

	it('opens the base app URL with a #/mock-api hash when called with "mock-api"', () => {
		openApp('mock-api');

		expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'src/app/index.html#/mock-api' });
	});

	it('opens the base app URL with a #/redirects hash when called with "redirects"', () => {
		openApp('redirects');

		expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'src/app/index.html#/redirects' });
	});
});
