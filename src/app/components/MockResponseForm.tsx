import {
	Box,
	FormControl,
	FormHelperText,
	MenuItem,
	Select,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import { EditorTopBar } from './EditorTopBar';
import { JsonEditor } from './JsonEditor';
import { HTTP_METHODS } from '../../shared/items/types';
import type { HttpMethod } from '../../shared/items/types';
import { NULL_BODY_STATUSES } from '../../shared/mocks/nullBodyStatuses';
import type { MockResponseDraft } from '../../shared/items/mockResponseDraft';

interface MockResponseFormProps {
	draft: MockResponseDraft;
	onDraftChange: (draft: MockResponseDraft) => void;
	errors: Partial<Record<keyof MockResponseDraft, string>>;
	breadcrumbLabel: string;
	onBreadcrumbBack?: () => void;
	onSave: () => void;
	overflowMenuItems?: ReactNode;
}

/**
 * The mock response editor: a top bar, an editable title, an "If request" section (URL
 * pattern + method), a "Response" section (status code + status text), and a "Response Body"
 * JSON editor. Fully controlled and storage-unaware — the parent owns the draft, validation
 * errors, and save/navigation behavior.
 *
 * @param props.draft - The form's current, all-string field values.
 * @param props.onDraftChange - Called with the next draft whenever any field changes.
 * @param props.errors - Per-field validation messages from `validateMockResponseDraft`.
 * @param props.breadcrumbLabel - The top bar's "Mock APIs > {breadcrumbLabel}" label.
 * @param props.onBreadcrumbBack - Called when the "Mock APIs" breadcrumb segment is clicked.
 * @param props.onSave - Called when the Save button is clicked.
 * @param props.overflowMenuItems - Menu items for the top bar's overflow menu; omitted entirely
 * when not provided (e.g. on the create route, which has nothing to put there yet).
 * @returns The mock response editor UI.
 */
export const MockResponseForm = ({
	draft,
	onDraftChange,
	errors,
	breadcrumbLabel,
	onBreadcrumbBack,
	onSave,
	overflowMenuItems,
}: MockResponseFormProps) => {
	const statusCodeNumber = Number(draft.statusCode.trim());
	const isNullBodyStatus = NULL_BODY_STATUSES.has(statusCodeNumber);

	/** Applies a single field change on top of the current draft and reports the next draft. */
	const updateField = <Field extends keyof MockResponseDraft>(
		field: Field,
		value: MockResponseDraft[Field],
	) => {
		onDraftChange({ ...draft, [field]: value });
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column' }}>
			<EditorTopBar
				rootBreadcrumbLabel="Mock APIs"
				breadcrumbLabel={breadcrumbLabel}
				onBreadcrumbBack={onBreadcrumbBack}
				enabled={draft.enabled}
				onEnabledChange={(enabled) => updateField('enabled', enabled)}
				onSave={onSave}
				overflowMenuItems={overflowMenuItems}
			/>

			<TextField
				variant="standard"
				placeholder="Mock name"
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
					<Typography sx={{ pt: 2 }}>URL</Typography>
					<Tooltip title="Matches when the request URL contains this text as a plain substring — not a glob or regex pattern.">
						<Typography sx={{ pt: 2 }}>Contains</Typography>
					</Tooltip>
					<TextField
						label="URL pattern"
						value={draft.urlPattern}
						onChange={(event) => updateField('urlPattern', event.target.value)}
						error={Boolean(errors.urlPattern)}
						helperText={
							errors.urlPattern ??
							'Plain substring match — not a glob or regex pattern.'
						}
						fullWidth
					/>
					<FormControl error={Boolean(errors.method)} sx={{ minWidth: 130 }}>
						<Select
							value={draft.method}
							aria-label="Method"
							aria-describedby={errors.method ? 'method-helper-text' : undefined}
							onChange={(event: SelectChangeEvent) =>
								updateField('method', event.target.value as HttpMethod)
							}
						>
							{HTTP_METHODS.map((method) => (
								<MenuItem key={method} value={method}>
									{method}
								</MenuItem>
							))}
						</Select>
						{errors.method && (
							<FormHelperText id="method-helper-text">{errors.method}</FormHelperText>
						)}
					</FormControl>
				</Box>
			</Box>

			<Box>
				<Typography variant="subtitle1" gutterBottom>
					Response
				</Typography>
				<Box sx={{ display: 'flex', gap: 2 }}>
					<TextField
						label="Status Code"
						value={draft.statusCode}
						onChange={(event) => updateField('statusCode', event.target.value)}
						error={Boolean(errors.statusCode)}
						helperText={errors.statusCode ?? 'Required. Integer between 100 and 599.'}
					/>
					<TextField
						label="Status Text"
						value={draft.statusText}
						onChange={(event) => updateField('statusText', event.target.value)}
						error={Boolean(errors.statusText)}
						helperText={errors.statusText ?? 'Optional.'}
					/>
				</Box>
			</Box>

			<Box>
				<Typography variant="subtitle1" gutterBottom>
					Response Body
				</Typography>
				<JsonEditor
					value={draft.body}
					onChange={(value) => updateField('body', value)}
					disabled={isNullBodyStatus}
					error={errors.body}
					disabledCaption={`Body is not allowed for status ${draft.statusCode}; it will be cleared on save.`}
					label="Response Body"
				/>
			</Box>
		</Box>
	);
};
