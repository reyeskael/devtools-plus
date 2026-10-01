import { fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RedirectRuleForm } from './RedirectRuleForm';
import type { RedirectRuleDraft } from '../../shared/items/redirectRuleDraft';

const makeDraft = (overrides: Partial<RedirectRuleDraft> = {}): RedirectRuleDraft => ({
	name: 'Old API redirect',
	matchType: 'wildcard',
	urlPattern: '/api/v1/*',
	destination: 'https://example.com/new/$1',
	enabled: true,
	...overrides,
});

interface RenderOverrides {
	draft?: RedirectRuleDraft;
	onDraftChange?: jest.Mock;
	errors?: Partial<Record<keyof RedirectRuleDraft, string>>;
	warnings?: Partial<Record<keyof RedirectRuleDraft, string>>;
	breadcrumbLabel?: string;
	onBreadcrumbBack?: jest.Mock;
	onSave?: jest.Mock;
}

const renderForm = (overrides: RenderOverrides = {}) => {
	const onDraftChange = overrides.onDraftChange ?? jest.fn();
	const onSave = overrides.onSave ?? jest.fn();
	const onBreadcrumbBack = overrides.onBreadcrumbBack ?? jest.fn();
	render(
		<RedirectRuleForm
			draft={overrides.draft ?? makeDraft()}
			onDraftChange={onDraftChange}
			errors={overrides.errors ?? {}}
			warnings={overrides.warnings}
			breadcrumbLabel={overrides.breadcrumbLabel ?? 'New redirect rule'}
			onBreadcrumbBack={onBreadcrumbBack}
			onSave={onSave}
		/>,
	);
	return { onDraftChange, onSave, onBreadcrumbBack };
};

describe('RedirectRuleForm', () => {
	it('renders the title field with the draft name', () => {
		renderForm({ draft: makeDraft({ name: 'Old API redirect' }) });
		expect(screen.getByDisplayValue('Old API redirect')).toBeInTheDocument();
	});

	it('calls onDraftChange with the whole next draft when the name field changes', () => {
		const draft = makeDraft({ name: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByPlaceholderText('Redirect rule name'), {
			target: { value: 'X' },
		});
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, name: 'X' });
	});

	it('shows the name error when provided', () => {
		renderForm({ errors: { name: 'Name is required' } });
		expect(screen.getByText('Name is required')).toBeInTheDocument();
	});

	it('renders the matchType Select with the draft value and lets the user change it', async () => {
		const draft = makeDraft({ matchType: 'wildcard' });
		const { onDraftChange } = renderForm({ draft });

		const matchTypeSelect = screen.getByRole('combobox', { name: 'Match type' });
		expect(matchTypeSelect).toHaveTextContent('Wildcard');

		await userEvent.click(matchTypeSelect);
		await userEvent.click(screen.getByRole('option', { name: 'Regex' }));

		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenLastCalledWith({ ...draft, matchType: 'regex' });
	});

	it('calls onDraftChange with the whole next draft when the urlPattern field changes', () => {
		const draft = makeDraft({ urlPattern: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByLabelText('URL pattern'), { target: { value: '/x/*' } });
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, urlPattern: '/x/*' });
	});

	it('shows the urlPattern error when provided', () => {
		renderForm({ errors: { urlPattern: 'URL pattern must be a non-empty string' } });
		expect(screen.getByText('URL pattern must be a non-empty string')).toBeInTheDocument();
	});

	it('calls onDraftChange with the whole next draft when the destination field changes', () => {
		const draft = makeDraft({ destination: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByLabelText('Destination'), {
			target: { value: 'https://example.com/$1' },
		});
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({
			...draft,
			destination: 'https://example.com/$1',
		});
	});

	it('shows the destination error when provided', () => {
		renderForm({ errors: { destination: 'Destination is required' } });
		expect(screen.getByText('Destination is required')).toBeInTheDocument();
	});

	it('does not render a urlPattern warning when none is provided', () => {
		renderForm();
		expect(screen.queryByRole('alert', { name: /redirect loop/i })).not.toBeInTheDocument();
		expect(
			screen.queryByText(/This pattern matches its own destination/),
		).not.toBeInTheDocument();
	});

	it('renders the D15 urlPattern warning as a non-blocking alert when provided', () => {
		renderForm({
			warnings: {
				urlPattern:
					'This pattern matches its own destination, which can cause a redirect loop (ERR_TOO_MANY_REDIRECTS).',
			},
		});
		expect(
			screen.getByText(
				'This pattern matches its own destination, which can cause a redirect loop (ERR_TOO_MANY_REDIRECTS).',
			),
		).toBeInTheDocument();
	});

	it('still calls onSave when Save is clicked while a urlPattern warning is present', async () => {
		const { onSave } = renderForm({
			warnings: { urlPattern: 'This pattern matches its own destination.' },
		});
		await userEvent.click(screen.getByRole('button', { name: 'Save' }));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('calls onSave when the Save button is clicked', async () => {
		const { onSave } = renderForm();
		await userEvent.click(screen.getByRole('button', { name: 'Save' }));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('renders the breadcrumb label', () => {
		renderForm({ breadcrumbLabel: 'Old API redirect' });
		expect(screen.getByText('Old API redirect')).toBeInTheDocument();
	});

	it('calls onBreadcrumbBack when the "Redirect Rules" breadcrumb segment is clicked', async () => {
		const { onBreadcrumbBack } = renderForm();
		await userEvent.click(screen.getByRole('button', { name: 'Redirect Rules' }));
		expect(onBreadcrumbBack).toHaveBeenCalledTimes(1);
	});

	it('does not render the overflow menu button when overflowMenuItems is not provided', () => {
		renderForm();
		expect(screen.queryByRole('button', { name: /more menu/i })).not.toBeInTheDocument();
	});

	it('renders the overflow menu button and its items when overflowMenuItems is provided', async () => {
		render(
			<RedirectRuleForm
				draft={makeDraft()}
				onDraftChange={jest.fn()}
				errors={{}}
				breadcrumbLabel="Old API redirect"
				onSave={jest.fn()}
				overflowMenuItems={<li role="menuitem">Delete</li>}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: 'Open more menu' }));
		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
	});

	it('reflects draft.enabled on the Enabled switch', () => {
		const { rerender } = render(
			<RedirectRuleForm
				draft={makeDraft({ enabled: true })}
				onDraftChange={jest.fn()}
				errors={{}}
				breadcrumbLabel="Old API redirect"
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: 'Enabled' })).toBeChecked();

		rerender(
			<RedirectRuleForm
				draft={makeDraft({ enabled: false })}
				onDraftChange={jest.fn()}
				errors={{}}
				breadcrumbLabel="Old API redirect"
				onSave={jest.fn()}
			/>,
		);
		expect(screen.getByRole('switch', { name: 'Enabled' })).not.toBeChecked();
	});

	it('calls onDraftChange with the whole next draft when the enabled switch is toggled', async () => {
		const draft = makeDraft({ enabled: false });
		const { onDraftChange } = renderForm({ draft });
		await userEvent.click(screen.getByRole('switch', { name: 'Enabled' }));
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, enabled: true });
	});

	it('does not render the PatternTester dialog until the "Test pattern" button is clicked', () => {
		renderForm();
		expect(screen.queryByLabelText('Sample request URL')).not.toBeInTheDocument();
	});

	it('opens the PatternTester dialog when the "Test pattern" button is clicked', async () => {
		renderForm();
		await userEvent.click(screen.getByRole('button', { name: 'Test pattern' }));
		expect(screen.getByLabelText('Sample request URL')).toBeInTheDocument();
	});

	it('closes the PatternTester dialog when Close is clicked', async () => {
		renderForm();
		await userEvent.click(screen.getByRole('button', { name: 'Test pattern' }));
		const sampleUrlField = screen.getByLabelText('Sample request URL');

		await userEvent.click(screen.getByRole('button', { name: 'Close' }));
		await waitForElementToBeRemoved(sampleUrlField);
	});
});
