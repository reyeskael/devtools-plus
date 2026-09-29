import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportDialog } from './ImportDialog';

interface RenderOverrides {
	open?: boolean;
	onFileSelected?: jest.Mock;
	onConfirmPaste?: jest.Mock;
	onClose?: jest.Mock;
}

const renderDialog = (overrides: RenderOverrides = {}) => {
	const props = {
		open: overrides.open ?? true,
		onFileSelected: overrides.onFileSelected ?? jest.fn(),
		onConfirmPaste: overrides.onConfirmPaste ?? jest.fn(),
		onClose: overrides.onClose ?? jest.fn(),
	};
	const view = render(<ImportDialog {...props} />);
	return { ...props, rerender: view.rerender };
};

describe('ImportDialog', () => {
	it('does not render dialog content when closed', () => {
		renderDialog({ open: false });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('renders the title, file picker, paste textarea, Cancel, and Import controls when open', () => {
		renderDialog();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Import items')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /choose json file/i })).toBeInTheDocument();
		expect(screen.getByPlaceholderText('[ ... ]')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
	});

	it('disables the Import button while the paste field is empty or whitespace-only', () => {
		renderDialog();
		expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

		fireEvent.change(screen.getByPlaceholderText('[ ... ]'), { target: { value: '   ' } });
		expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
	});

	it('enables the Import button once the paste field has non-whitespace content', () => {
		renderDialog();

		fireEvent.change(screen.getByPlaceholderText('[ ... ]'), { target: { value: '[]' } });

		expect(screen.getByRole('button', { name: 'Import' })).not.toBeDisabled();
	});

	it('reflects typed text in the textarea', () => {
		renderDialog();

		fireEvent.change(screen.getByPlaceholderText('[ ... ]'), {
			target: { value: '[{"id":"1"}]' },
		});

		expect(screen.getByPlaceholderText('[ ... ]')).toHaveValue('[{"id":"1"}]');
	});

	it('calls onConfirmPaste with the current paste field text when the Import button is clicked', async () => {
		const onConfirmPaste = jest.fn();
		renderDialog({ onConfirmPaste });

		fireEvent.change(screen.getByPlaceholderText('[ ... ]'), { target: { value: '[]' } });
		await userEvent.click(screen.getByRole('button', { name: 'Import' }));

		expect(onConfirmPaste).toHaveBeenCalledTimes(1);
		expect(onConfirmPaste).toHaveBeenCalledWith('[]');
	});

	it('calls onClose when Cancel is clicked', async () => {
		const onClose = jest.fn();
		renderDialog({ onClose });

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('clears the paste field once the dialog finishes closing', async () => {
		const { onFileSelected, onConfirmPaste, onClose, rerender } = renderDialog({ open: true });

		fireEvent.change(screen.getByPlaceholderText('[ ... ]'), { target: { value: 'some text' } });
		expect(screen.getByPlaceholderText('[ ... ]')).toHaveValue('some text');

		rerender(
			<ImportDialog
				open={false}
				onFileSelected={onFileSelected}
				onConfirmPaste={onConfirmPaste}
				onClose={onClose}
			/>,
		);
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		rerender(
			<ImportDialog
				open={true}
				onFileSelected={onFileSelected}
				onConfirmPaste={onConfirmPaste}
				onClose={onClose}
			/>,
		);
		expect(screen.getByPlaceholderText('[ ... ]')).toHaveValue('');
	});

	it('calls onFileSelected with the chosen file and resets the input value', () => {
		const onFileSelected = jest.fn();
		renderDialog({ onFileSelected });

		const file = new File(['[]'], 'items.json', { type: 'application/json' });
		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		expect(input).not.toBeNull();

		fireEvent.change(input, { target: { files: [file] } });

		expect(onFileSelected).toHaveBeenCalledTimes(1);
		expect(onFileSelected).toHaveBeenCalledWith(file);
		expect(input.value).toBe('');
	});

	it('does not call onFileSelected when the file input changes with no file', () => {
		const onFileSelected = jest.fn();
		renderDialog({ onFileSelected });

		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		fireEvent.change(input, { target: { files: [] } });

		expect(onFileSelected).not.toHaveBeenCalled();
	});
});
