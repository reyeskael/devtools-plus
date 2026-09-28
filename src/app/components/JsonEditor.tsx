import { FormHelperText, Typography } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';

interface JsonEditorProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	error?: string;
	disabledCaption?: string;
	label?: string;
}

/**
 * Thin wrapper around CodeMirror 6 for editing a JSON response body, with inline syntax
 * linting via `jsonParseLinter()`. The only file in the repo that imports CodeMirror, so the
 * editor stays swappable behind this interface.
 *
 * @param props.value - The current JSON text (controlled).
 * @param props.onChange - Called with the new text as the user types.
 * @param props.disabled - Whether the editor is read-only (e.g. a null-body status code).
 * @param props.error - A field-level validation message from the parent, shown like `TextField`
 * helper text — distinct from CodeMirror's own inline lint markers.
 * @param props.disabledCaption - Explanatory text shown below the editor while `disabled`.
 * @param props.label - Accessible name for the underlying CodeMirror editor.
 * @returns The JSON editor UI.
 */
export const JsonEditor = ({
	value,
	onChange,
	disabled = false,
	error,
	disabledCaption,
	label = 'Response Body',
}: JsonEditorProps) => {
	return (
		<>
			<CodeMirror
				value={value}
				onChange={onChange}
				editable={!disabled}
				readOnly={disabled}
				extensions={[
					json(),
					linter(jsonParseLinter()),
					EditorView.contentAttributes.of({ 'aria-label': label }),
				]}
			/>
			{disabled && disabledCaption && (
				<Typography variant="caption" color="text.secondary">
					{disabledCaption}
				</Typography>
			)}
			{error && <FormHelperText error>{error}</FormHelperText>}
		</>
	);
};
