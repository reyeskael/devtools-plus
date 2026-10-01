import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Select,
	TextField,
	Tooltip,
} from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import { EditorTopBar } from './EditorTopBar';
import { PatternTester } from './PatternTester';
import type { RedirectMatchType } from '../../shared/items/types';
import type { RedirectRuleDraft } from '../../shared/items/redirectRuleDraft';

interface RedirectRuleFormProps {
	draft: RedirectRuleDraft;
	onDraftChange: (draft: RedirectRuleDraft) => void;
	errors: Partial<Record<keyof RedirectRuleDraft, string>>;
	warnings?: Partial<Record<keyof RedirectRuleDraft, string>>;
	breadcrumbLabel: string;
	onBreadcrumbBack?: () => void;
	onSave: () => void;
	overflowMenuItems?: ReactNode;
}

/**
 * The redirect rule editor: a top bar, an editable title, a "Match" section (match type + URL
 * pattern), a "Redirect to" destination field, and a `PatternTester` live preview opened from a
 * button on the URL pattern field, shown in a dialog. Fully controlled and storage-unaware — the
 * parent owns the draft, validation errors/warnings, and save/navigation behavior. Patterned
 * directly on `MockResponseForm`.
 *
 * @param props.draft - The form's current, all-string/array field values.
 * @param props.onDraftChange - Called with the next draft whenever any field changes.
 * @param props.errors - Per-field validation messages from `validateRedirectRuleDraft`.
 * @param props.warnings - Per-field non-blocking warnings from `validateRedirectRuleDraft`
 * (e.g. the D15 redirect-loop self-match warning on `urlPattern`). Never blocks saving.
 * @param props.breadcrumbLabel - The top bar's "Redirect Rules > {breadcrumbLabel}" label.
 * @param props.onBreadcrumbBack - Called when the root breadcrumb segment is clicked.
 * @param props.onSave - Called when the Save button is clicked.
 * @param props.overflowMenuItems - Menu items for the top bar's overflow menu; omitted entirely
 * when not provided (e.g. on the create route, which has nothing to put there yet).
 * @returns The redirect rule editor UI.
 */
export const RedirectRuleForm = ({
	draft,
	onDraftChange,
	errors,
	warnings,
	breadcrumbLabel,
	onBreadcrumbBack,
	onSave,
	overflowMenuItems,
}: RedirectRuleFormProps) => {
	// The pattern tester's sample URL is ephemeral preview-only UI state — it isn't part of the
	// saved `RedirectRuleItem`, so it lives here rather than flowing through `onDraftChange`.
	const [sampleUrl, setSampleUrl] = useState('');
	const [isPatternTesterOpen, setIsPatternTesterOpen] = useState(false);

	/** Applies a single field change on top of the current draft and reports the next draft. */
	const updateField = <Field extends keyof RedirectRuleDraft>(
		field: Field,
		value: RedirectRuleDraft[Field],
	) => {
		onDraftChange({ ...draft, [field]: value });
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column' }}>
			<EditorTopBar
				rootBreadcrumbLabel="Redirect Rules"
				breadcrumbLabel={breadcrumbLabel}
				onBreadcrumbBack={onBreadcrumbBack}
				enabled={draft.enabled}
				onEnabledChange={(enabled) => updateField('enabled', enabled)}
				onSave={onSave}
				overflowMenuItems={overflowMenuItems}
			/>

			<TextField
				variant="standard"
				placeholder="Redirect rule name"
				value={draft.name}
				onChange={(event) => updateField('name', event.target.value)}
				error={Boolean(errors.name)}
				helperText={errors.name}
				fullWidth
				slotProps={{ input: { disableUnderline: true } }}
				sx={{ '& .MuiInputBase-input': { fontSize: '2rem', fontWeight: 600 } }}
			/>

			<Box>
				<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
					<FormControl sx={{ minWidth: 130 }}>
						<InputLabel id="redirect-match-type-label">Match type</InputLabel>
						<Select
							labelId="redirect-match-type-label"
							label="Match type"
							value={draft.matchType}
							onChange={(event: SelectChangeEvent) =>
								updateField('matchType', event.target.value as RedirectMatchType)
							}
						>
							<MenuItem value="wildcard">Wildcard</MenuItem>
							<MenuItem value="regex">Regex</MenuItem>
						</Select>
					</FormControl>
					<Tooltip
						title={
							draft.matchType === 'wildcard'
								? 'Each * matches anything and becomes a $1..$9 capture group the destination can reference.'
								: 'A JavaScript-style regular expression. Capture groups are referenced as $1..$9 in the destination.'
						}
					>
						<TextField
							label="URL pattern"
							value={draft.urlPattern}
							onChange={(event) => updateField('urlPattern', event.target.value)}
							error={Boolean(errors.urlPattern)}
							helperText={errors.urlPattern}
							fullWidth
							slotProps={{
								input: {
									endAdornment: (
										<InputAdornment position="end">
											<Tooltip title="Test this pattern">
												<IconButton
													aria-label="Test pattern"
													onClick={() => setIsPatternTesterOpen(true)}
													edge="end"
												>
													<ScienceOutlinedIcon />
												</IconButton>
											</Tooltip>
										</InputAdornment>
									),
								},
							}}
						/>
					</Tooltip>
				</Box>

				<TextField
					label="Destination"
					value={draft.destination}
					onChange={(event) => updateField('destination', event.target.value)}
					error={Boolean(errors.destination)}
					helperText={
						errors.destination ??
						'Static URL, or a template referencing $1..$9 capture groups ($$ escapes a literal $).'
					}
					fullWidth
					sx={{ mt: 2 }}
				/>

				{warnings?.urlPattern && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						{warnings.urlPattern}
					</Alert>
				)}
			</Box>

			<Dialog
				open={isPatternTesterOpen}
				onClose={() => setIsPatternTesterOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Pattern tester</DialogTitle>
				<DialogContent>
					<PatternTester
						matchType={draft.matchType}
						urlPattern={draft.urlPattern}
						destination={draft.destination}
						sampleUrl={sampleUrl}
						onSampleUrlChange={setSampleUrl}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setIsPatternTesterOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};
