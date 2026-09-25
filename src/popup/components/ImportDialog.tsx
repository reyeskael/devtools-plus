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
import type { ChangeEvent } from 'react';

interface ImportDialogProps {
	open: boolean;
	pastedText: string;
	onPastedTextChange: (value: string) => void;
	onFileSelected: (file: File) => void;
	onConfirmPaste: () => void;
	onClose: () => void;
}

export const ImportDialog = ({
	open,
	pastedText,
	onPastedTextChange,
	onFileSelected,
	onConfirmPaste,
	onClose,
}: ImportDialogProps) => {
	const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			onFileSelected(file);
		}
		event.target.value = '';
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
						onChange={(event) => onPastedTextChange(event.target.value)}
						fullWidth
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" disabled={!pastedText.trim()} onClick={onConfirmPaste}>
					Import
				</Button>
			</DialogActions>
		</Dialog>
	);
};
