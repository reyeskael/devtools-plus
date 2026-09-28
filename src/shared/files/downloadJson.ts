export interface DownloadJsonDeps {
	createObjectURL: (blob: Blob) => string;
	revokeObjectURL: (url: string) => void;
}

const defaultDeps: DownloadJsonDeps = {
	createObjectURL: (blob) => URL.createObjectURL(blob),
	revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

/**
 * Triggers a browser download of `contents` as a `.json` file named `filename`, via a
 * transient object URL and anchor click (no server round-trip).
 *
 * @param filename - The name the downloaded file is saved as.
 * @param contents - The raw file contents to download.
 * @param deps - Object URL creation/revocation, injectable since jsdom has no `URL.createObjectURL`.
 * @returns Nothing; the download is a side effect.
 */
export const downloadJson = (
	filename: string,
	contents: string,
	deps: DownloadJsonDeps = defaultDeps,
): void => {
	const blob = new Blob([contents], { type: 'application/json' });
	const url = deps.createObjectURL(blob);

	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);

	deps.revokeObjectURL(url);
};

/**
 * Builds the export filename, stamped with today's date (e.g. `devtools-plus-items-2026-09-28.json`).
 *
 * @param now - Injectable clock, so tests can pin the date.
 * @returns The filename, e.g. `"devtools-plus-items-2026-09-28.json"`.
 */
export const buildExportFilename = (now: () => Date = () => new Date()): string => {
	const isoDate = now().toISOString().slice(0, 10);
	return `devtools-plus-items-${isoDate}.json`;
};
