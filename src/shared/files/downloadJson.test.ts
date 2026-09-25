import { buildExportFilename, downloadJson } from './downloadJson';

describe('downloadJson', () => {
	it('creates an object URL for a JSON blob, clicks an anchor with the right href/download, cleans up, and revokes the URL', () => {
		const createObjectURL = jest.fn<string, [Blob]>(() => 'blob:fake-url');
		const revokeObjectURL = jest.fn();
		const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		const appendSpy = jest.spyOn(document.body, 'appendChild');
		const removeSpy = jest.spyOn(document.body, 'removeChild');

		downloadJson('devtools-plus-items-2026-01-01.json', '{"a":1}\n', {
			createObjectURL,
			revokeObjectURL,
		});

		expect(createObjectURL).toHaveBeenCalledTimes(1);
		const blobArg = createObjectURL.mock.calls[0][0];
		expect(blobArg).toBeInstanceOf(Blob);
		expect(blobArg.type).toBe('application/json');

		expect(appendSpy).toHaveBeenCalledTimes(1);
		const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
		expect(anchor.tagName).toBe('A');
		expect(anchor.href).toBe('blob:fake-url');
		expect(anchor.download).toBe('devtools-plus-items-2026-01-01.json');

		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(removeSpy).toHaveBeenCalledTimes(1);
		expect(removeSpy).toHaveBeenCalledWith(anchor);

		expect(revokeObjectURL).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');

		clickSpy.mockRestore();
		appendSpy.mockRestore();
		removeSpy.mockRestore();
	});
});

describe('buildExportFilename', () => {
	it('formats an injected now() as devtools-plus-items-YYYY-MM-DD.json', () => {
		const now = () => new Date('2026-03-05T12:34:56.000Z');

		expect(buildExportFilename(now)).toBe('devtools-plus-items-2026-03-05.json');
	});

	it('uses a different injected date correctly', () => {
		const now = () => new Date('2025-12-31T23:59:59.000Z');

		expect(buildExportFilename(now)).toBe('devtools-plus-items-2025-12-31.json');
	});
});
