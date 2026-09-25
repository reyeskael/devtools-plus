import { readFileAsText } from './readFileAsText';

describe('readFileAsText', () => {
	it('resolves with the text content of a real File', async () => {
		const file = new File(['{"hello":"world"}'], 'data.json', { type: 'application/json' });

		await expect(readFileAsText(file)).resolves.toBe('{"hello":"world"}');
	});

	it('resolves with empty-string content for an empty file', async () => {
		const file = new File([], 'empty.json', { type: 'application/json' });

		await expect(readFileAsText(file)).resolves.toBe('');
	});

	it('rejects with the reader error when FileReader fails', async () => {
		const originalFileReader = global.FileReader;
		const readerError = new Error('boom');

		class FailingFileReader {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			error: Error | null = readerError;
			result: string | null = null;

			readAsText(): void {
				queueMicrotask(() => this.onerror?.());
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(global as any).FileReader = FailingFileReader;

		try {
			const file = new File(['abc'], 'f.txt');
			await expect(readFileAsText(file)).rejects.toBe(readerError);
		} finally {
			global.FileReader = originalFileReader;
		}
	});
});
