export interface DownloadJsonDeps {
	createObjectURL: (blob: Blob) => string;
	revokeObjectURL: (url: string) => void;
}

const defaultDeps: DownloadJsonDeps = {
	createObjectURL: (blob) => URL.createObjectURL(blob),
	revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

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

export const buildExportFilename = (now: () => Date = () => new Date()): string => {
	const isoDate = now().toISOString().slice(0, 10);
	return `devtools-plus-items-${isoDate}.json`;
};
