/**
 * Reads a `File` (e.g. from a file input) into its full text contents.
 *
 * @param file - The file to read.
 * @returns A promise resolving to the file's text, or rejecting with the read error.
 */
export const readFileAsText = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
		reader.readAsText(file);
	});
