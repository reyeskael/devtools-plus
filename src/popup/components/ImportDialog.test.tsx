import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportDialog } from './ImportDialog';

interface RenderOverrides {
	open?: boolean;
	pastedText?: string;
	onPastedTextChange?: jest.Mock;
	onFileSelected?: jest.Mock;
	onConfirmPaste?: jest.Mock;
	onClose?: jest.Mock;
}

const renderDialog = (overrides: RenderOverrides = {}) => {
	const props = {
		open: overrides.open ?? true,
		pastedText: overrides.pastedText ?? '',
		onPastedTextChange: overrides.onPastedTextChange ?? jest.fn(),
		onFileSelected: overrides.onFileSelected ?? jest.fn(),
		onConfirmPaste: overrides.onConfirmPaste ?? jest.fn(),
		onClose: overrides.onClose ?? jest.fn(),
	};
	render(<ImportDialog {...props} />);
	return props;
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

	it('disables the Import button when pastedText is empty or whitespace-only', () => {
		renderDialog({ pastedText: '   ' });
		expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
	});

	it('enables the Import button when pastedText has non-whitespace content', () => {
		renderDialog({ pastedText: '[]' });
		expect(screen.getByRole('button', { name: 'Import' })).not.toBeDisabled();
	});

	it('displays the current pastedText value in the textarea', () => {
		renderDialog({ pastedText: '[{"id":"1"}]' });
		expect(screen.getByPlaceholderText('[ ... ]')).toHaveValue('[{"id":"1"}]');
	});

	it('calls onPastedTextChange with the new value when the textarea changes', () => {
		const onPastedTextChange = jest.fn();
		renderDialog({ onPastedTextChange });

		fireEvent.change(screen.getByPlaceholderText('[ ... ]'), {
			target: { value: '[1,2,3]' },
		});

		expect(onPastedTextChange).toHaveBeenCalledWith('[1,2,3]');
	});

	it('calls onConfirmPaste when the Import button is clicked', async () => {
		const onConfirmPaste = jest.fn();
		renderDialog({ pastedText: '[]', onConfirmPaste });

		await userEvent.click(screen.getByRole('button', { name: 'Import' }));

		expect(onConfirmPaste).toHaveBeenCalledTimes(1);
	});

	it('calls onClose when Cancel is clicked', async () => {
		const onClose = jest.fn();
		renderDialog({ onClose });

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onClose).toHaveBeenCalledTimes(1);
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
