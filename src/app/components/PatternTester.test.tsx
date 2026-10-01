import { act, fireEvent, render, screen } from '@testing-library/react';
import { PatternTester } from './PatternTester';
import { hasCaptureRef } from '../../shared/rules/pattern';
import type { RedirectMatchType } from '../../shared/items/types';

interface RenderOverrides {
	matchType?: RedirectMatchType;
	urlPattern?: string;
	destination?: string;
	sampleUrl?: string;
	onSampleUrlChange?: jest.Mock;
}

const renderTester = (overrides: RenderOverrides = {}) => {
	const onSampleUrlChange = overrides.onSampleUrlChange ?? jest.fn();
	const utils = render(
		<PatternTester
			matchType={overrides.matchType ?? 'wildcard'}
			urlPattern={overrides.urlPattern ?? '/api/v1/*'}
			destination={overrides.destination ?? 'https://example.com/new/$1'}
			sampleUrl={overrides.sampleUrl ?? ''}
			onSampleUrlChange={onSampleUrlChange}
		/>,
	);
	return { ...utils, onSampleUrlChange };
};

const isRegexSupportedMock = () =>
	chrome.declarativeNetRequest.isRegexSupported as jest.Mock;

describe('PatternTester', () => {
	it('renders the sample URL field and calls onSampleUrlChange on input', () => {
		const { onSampleUrlChange } = renderTester();
		const field = screen.getByLabelText('Sample request URL');
		fireEvent.change(field, { target: { value: 'https://example.com/api/v1/foo' } });
		expect(onSampleUrlChange).toHaveBeenCalledTimes(1);
		expect(onSampleUrlChange).toHaveBeenCalledWith('https://example.com/api/v1/foo');
	});

	it('shows no match-result alert when sampleUrl is empty', () => {
		renderTester({ sampleUrl: '' });
		expect(screen.queryByText(/Matches\. Would redirect to/)).not.toBeInTheDocument();
		expect(screen.queryByText('Does not match the sample URL.')).not.toBeInTheDocument();
	});

	it('shows a success alert with the previewed result when the wildcard pattern matches', () => {
		renderTester({
			matchType: 'wildcard',
			urlPattern: '/api/*',
			destination: 'https://new.example.com/$1',
			sampleUrl: 'https://old.example.com/api/foo',
		});
		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent('Matches. Would redirect to: https://new.example.com/foo');
	});

	it('shows a warning alert when the pattern does not match the sample URL', () => {
		renderTester({
			matchType: 'wildcard',
			urlPattern: '/api/*',
			destination: 'https://new.example.com/$1',
			sampleUrl: 'https://old.example.com/other',
		});
		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent('Does not match the sample URL.');
	});

	it('never calls isRegexSupported in wildcard mode and renders no regex-check alert', () => {
		renderTester({ matchType: 'wildcard', urlPattern: '/api/*' });
		expect(isRegexSupportedMock()).not.toHaveBeenCalled();
		expect(screen.queryByText(/Chrome will/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Checking whether Chrome/)).not.toBeInTheDocument();
	});

	it('does not call isRegexSupported in regex mode when urlPattern is empty', () => {
		renderTester({ matchType: 'regex', urlPattern: '' });
		expect(isRegexSupportedMock()).not.toHaveBeenCalled();
	});

	it('calls isRegexSupported with the regex and derived requireCapturing when matchType is regex', async () => {
		const urlPattern = '^/api/(.+)$';
		const destination = 'https://example.com/$1';
		renderTester({ matchType: 'regex', urlPattern, destination });
		expect(isRegexSupportedMock()).toHaveBeenCalledWith({
			regex: urlPattern,
			requireCapturing: hasCaptureRef(destination),
		});
		expect(hasCaptureRef(destination)).toBe(true);
		// Let the default-resolved mock settle so no state update leaks past this test.
		await screen.findByText('Chrome will accept this pattern.');
	});

	it('calls isRegexSupported with requireCapturing false when the destination has no capture ref', async () => {
		const urlPattern = '^/api/foo$';
		const destination = 'https://example.com/foo';
		renderTester({ matchType: 'regex', urlPattern, destination });
		expect(isRegexSupportedMock()).toHaveBeenCalledWith({
			regex: urlPattern,
			requireCapturing: false,
		});
		await screen.findByText('Chrome will accept this pattern.');
	});

	it('shows a checking state while the regex check is pending', () => {
		isRegexSupportedMock().mockReturnValueOnce(new Promise(() => {}));
		renderTester({ matchType: 'regex', urlPattern: '^/api/.*$' });
		expect(
			screen.getByText('Checking whether Chrome will accept this pattern…'),
		).toBeInTheDocument();
	});

	it('shows a success alert once isRegexSupported resolves as supported', async () => {
		isRegexSupportedMock().mockResolvedValueOnce({ isSupported: true });
		renderTester({ matchType: 'regex', urlPattern: '^/api/.*$' });
		expect(
			await screen.findByText('Chrome will accept this pattern.'),
		).toBeInTheDocument();
	});

	it('shows an error alert with the reason once isRegexSupported resolves as unsupported', async () => {
		isRegexSupportedMock().mockResolvedValueOnce({
			isSupported: false,
			reason: 'unsupported regex: lookahead',
		});
		renderTester({ matchType: 'regex', urlPattern: '(?=foo)' });
		const alert = await screen.findByText(/Chrome will reject this pattern/);
		expect(alert).toHaveTextContent('Chrome will reject this pattern: unsupported regex: lookahead');
	});

	it('treats an isRegexSupported rejection as unsupported, without a reason, and without crashing', async () => {
		isRegexSupportedMock().mockRejectedValueOnce(new Error('boom'));
		renderTester({ matchType: 'regex', urlPattern: '^/api/.*$' });
		const alert = await screen.findByText(/Chrome will reject this pattern/);
		expect(alert).toHaveTextContent('Chrome will reject this pattern.');
	});

	it('does not show a stale regex-check result from a previous pattern after the pattern changes', async () => {
		let resolveFirst: (value: { isSupported: boolean }) => void = () => {};
		const firstPromise = new Promise<{ isSupported: boolean }>((resolve) => {
			resolveFirst = resolve;
		});
		const mock = isRegexSupportedMock();
		mock.mockReturnValueOnce(firstPromise);
		mock.mockResolvedValueOnce({ isSupported: true });

		const { rerender } = render(
			<PatternTester
				matchType="regex"
				urlPattern="pattern-a"
				destination=""
				sampleUrl=""
				onSampleUrlChange={jest.fn()}
			/>,
		);

		// Pattern changes before the first (slow) check resolves.
		rerender(
			<PatternTester
				matchType="regex"
				urlPattern="pattern-b"
				destination=""
				sampleUrl=""
				onSampleUrlChange={jest.fn()}
			/>,
		);

		// The second (fast) check resolves for the current pattern.
		expect(await screen.findByText('Chrome will accept this pattern.')).toBeInTheDocument();

		// Now the stale first check resolves — it must not clobber the current, correct result.
		await act(async () => {
			resolveFirst({ isSupported: false });
		});

		expect(screen.getByText('Chrome will accept this pattern.')).toBeInTheDocument();
		expect(screen.queryByText(/Chrome will reject this pattern/)).not.toBeInTheDocument();
	});
});
