import { Alert, Box, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { hasCaptureRef } from '../../shared/rules/pattern';
import { previewRedirect } from '../../shared/rules/previewRedirect';
import type { RedirectMatchType } from '../../shared/items/types';

interface PatternTesterProps {
	matchType: RedirectMatchType;
	urlPattern: string;
	destination: string;
	sampleUrl: string;
	onSampleUrlChange: (sampleUrl: string) => void;
}

/** The settled outcome of one `chrome.declarativeNetRequest.isRegexSupported()` check, keyed to
 * the inputs it was computed for so a stale result from a previous pattern is never shown. */
interface RegexCheckResult {
	key: string;
	isSupported: boolean;
	reason?: string;
}

/**
 * A live pattern/destination preview, fully controlled and storage-unaware: given the current
 * `matchType`/`urlPattern`/`destination` and a sample request URL, shows whether the pattern
 * matches and what DNR's whole-URL-replacement would resolve the destination to (via
 * `previewRedirect`), surfacing the query-string-loss trap that a span-based mental model would
 * miss.
 *
 * For `matchType: 'regex'` only, also runs the pattern through
 * `chrome.declarativeNetRequest.isRegexSupported()` — a pattern can be syntactically valid JS
 * regex but still rejected by Chrome's RE2 engine at install time (no lookahead, lookbehind, or
 * backreferences). Wildcard patterns compile through `wildcardToRegex`, which already guarantees
 * an RE2-safe subset, so this async check is skipped for them.
 *
 * @param props.matchType - How `urlPattern` is interpreted.
 * @param props.urlPattern - The rule's current match pattern.
 * @param props.destination - The rule's current destination template.
 * @param props.sampleUrl - The sample request URL to test the pattern against.
 * @param props.onSampleUrlChange - Called with the next sample URL whenever the input changes.
 * @returns The pattern tester UI.
 */
export const PatternTester = ({
	matchType,
	urlPattern,
	destination,
	sampleUrl,
	onSampleUrlChange,
}: PatternTesterProps) => {
	const [regexCheckResult, setRegexCheckResult] = useState<RegexCheckResult | null>(null);

	const requireCapturing = hasCaptureRef(destination);
	// `null` means "not applicable" (wildcard mode, or an empty pattern mid-edit) — wildcard
	// patterns compile through `wildcardToRegex`, which already guarantees an RE2-safe subset, so
	// there's nothing to ask Chrome about.
	const regexCheckKey =
		matchType === 'regex' && urlPattern.trim().length > 0
			? `${urlPattern}::${requireCapturing}`
			: null;

	useEffect(() => {
		if (!regexCheckKey) {
			return;
		}

		let cancelled = false;
		chrome.declarativeNetRequest
			.isRegexSupported({ regex: urlPattern, requireCapturing })
			.then((result) => {
				if (!cancelled) {
					setRegexCheckResult({
						key: regexCheckKey,
						isSupported: result.isSupported,
						reason: result.reason,
					});
				}
			})
			.catch(() => {
				if (!cancelled) {
					setRegexCheckResult({ key: regexCheckKey, isSupported: false });
				}
			});

		return () => {
			cancelled = true;
		};
	}, [regexCheckKey, urlPattern, requireCapturing]);

	// Derived, not stored: "checking" is simply "the effect for the current inputs hasn't
	// resolved yet" — there's no separate settled result keyed to `regexCheckKey`.
	const regexCheckStatus: 'not-applicable' | 'checking' | 'supported' | 'unsupported' =
		!regexCheckKey
			? 'not-applicable'
			: regexCheckResult?.key !== regexCheckKey
				? 'checking'
				: regexCheckResult.isSupported
					? 'supported'
					: 'unsupported';

	const preview =
		sampleUrl.trim().length > 0
			? previewRedirect({ matchType, urlPattern, destination }, sampleUrl)
			: undefined;

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<TextField
				label="Sample request URL"
				placeholder="https://example.com/api/v1/users/42?foo=bar"
				value={sampleUrl}
				onChange={(event) => onSampleUrlChange(event.target.value)}
				fullWidth
			/>

			{regexCheckStatus === 'checking' && (
				<Alert severity="info">Checking whether Chrome will accept this pattern…</Alert>
			)}
			{regexCheckStatus === 'supported' && (
				<Alert severity="success">Chrome will accept this pattern.</Alert>
			)}
			{regexCheckStatus === 'unsupported' && (
				<Alert severity="error">
					Chrome will reject this pattern
					{regexCheckResult?.reason ? `: ${regexCheckResult.reason}` : '.'}
				</Alert>
			)}

			{preview && (
				<Alert severity={preview.matched ? 'success' : 'warning'}>
					{preview.matched
						? `Matches. Would redirect to: ${preview.result}`
						: 'Does not match the sample URL.'}
				</Alert>
			)}
		</Box>
	);
};
