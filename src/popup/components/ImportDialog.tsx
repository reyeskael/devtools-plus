import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
	Typography,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useState, type ChangeEvent } from 'react';

interface ImportDialogProps {
	open: boolean;
	onFileSelected: (file: File) => void;
	onConfirmPaste: (pastedText: string) => void;
	onClose: () => void;
}

/**
 * Dialog for the popup toolbar's Import feature — pick a `.json` file or paste JSON text.
 *
 * @param props.open - Whether the dialog is visible.
 * @param props.onFileSelected - Called with the chosen file when one is picked.
 * @param props.onConfirmPaste - Called with the pasted text when the Import button is clicked.
 * @param props.onClose - Called when the dialog should close (backdrop click or Cancel).
 * @returns The import dialog UI.
 */
export const ImportDialog = ({ open, onFileSelected, onConfirmPaste, onClose }: ImportDialogProps) => {
	const [pastedText, setPastedText] = useState('');

	/** Reads the selected file (if any) and resets the input so re-picking the same file fires change again. */
	const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			onFileSelected(file);
		}
		event.target.value = '';
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="xs"
			fullWidth
			// Clears the paste field once the close transition finishes, however it closed
			// (Cancel, backdrop, or a successful import), instead of every caller of onClose
			// needing to remember to reset it.
			slotProps={{ transition: { onExited: () => setPastedText('') } }}
		>
			<DialogTitle>Import items</DialogTitle>
			<DialogContent>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
					<Button
						variant="outlined"
						component="label"
						startIcon={<FileUploadIcon />}
						fullWidth
					>
						Choose JSON file
						<input type="file" accept=".json" hidden onChange={handleFileInputChange} />
					</Button>
					<Typography variant="caption" color="text.secondary">
						or paste JSON below
					</Typography>
					<TextField
						multiline
						minRows={6}
						maxRows={10}
						placeholder="[ ... ]"
						value={pastedText}
						onChange={(event) => setPastedText(event.target.value)}
						fullWidth
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button
					variant="contained"
					disabled={!pastedText.trim()}
					onClick={() => onConfirmPaste(pastedText)}
				>
					Import
				</Button>
			</DialogActions>
		</Dialog>
	);
};
