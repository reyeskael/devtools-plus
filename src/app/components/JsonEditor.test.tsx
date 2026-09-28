import { render, screen } from '@testing-library/react';
import { JsonEditor } from './JsonEditor';

// jsdom has no ResizeObserver, which CodeMirror's layout code relies on. Stubbed locally
// (rather than in jest.setup.ts) since this is the one component that needs it.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
	ResizeObserverStub;

describe('JsonEditor', () => {
	it('renders without crashing', () => {
		const { container } = render(<JsonEditor value="{}" onChange={jest.fn()} />);
		expect(container).toBeInTheDocument();
	});

	it('makes the underlying editor read-only when disabled', () => {
		render(<JsonEditor value="{}" onChange={jest.fn()} disabled />);
		const content = screen.getByRole('textbox', { name: 'Response Body' });
		expect(content).toHaveAttribute('contenteditable', 'false');
		expect(content).toHaveAttribute('aria-readonly', 'true');
	});

	it('keeps the underlying editor editable when not disabled', () => {
		render(<JsonEditor value="{}" onChange={jest.fn()} />);
		const content = screen.getByRole('textbox', { name: 'Response Body' });
		expect(content).toHaveAttribute('contenteditable', 'true');
		expect(content).not.toHaveAttribute('aria-readonly');
	});

	it('exposes a custom accessible name via the label prop', () => {
		render(<JsonEditor value="{}" onChange={jest.fn()} label="Custom Label" />);
		expect(screen.getByRole('textbox', { name: 'Custom Label' })).toBeInTheDocument();
	});

	it('renders the disabled caption when disabled', () => {
		render(
			<JsonEditor
				value=""
				onChange={jest.fn()}
				disabled
				disabledCaption="Body is not allowed for status 204; it will be cleared on save."
			/>,
		);
		expect(
			screen.getByText('Body is not allowed for status 204; it will be cleared on save.'),
		).toBeInTheDocument();
	});

	it('does not render the disabled caption when not disabled', () => {
		render(
			<JsonEditor
				value=""
				onChange={jest.fn()}
				disabledCaption="Body is not allowed for status 204; it will be cleared on save."
			/>,
		);
		expect(
			screen.queryByText('Body is not allowed for status 204; it will be cleared on save.'),
		).not.toBeInTheDocument();
	});

	it('renders the error message when provided', () => {
		render(<JsonEditor value="{" onChange={jest.fn()} error="Body must be valid JSON" />);
		expect(screen.getByText('Body must be valid JSON')).toBeInTheDocument();
	});
});
