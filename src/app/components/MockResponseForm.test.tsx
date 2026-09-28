import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangeEvent } from 'react';
import { MockResponseForm } from './MockResponseForm';
import type { MockResponseDraft } from '../../shared/items/mockResponseDraft';

jest.mock('./JsonEditor', () => ({
	JsonEditor: (props: {
		value: string;
		onChange: (value: string) => void;
		disabled?: boolean;
		error?: string;
		disabledCaption?: string;
	}) => (
		<div>
			<textarea
				aria-label="Response Body"
				value={props.value}
				disabled={props.disabled}
				onChange={(event: ChangeEvent<HTMLTextAreaElement>) => props.onChange(event.target.value)}
			/>
			{props.disabled && props.disabledCaption && <span>{props.disabledCaption}</span>}
			{props.error && <span>{props.error}</span>}
		</div>
	),
}));

const makeDraft = (overrides: Partial<MockResponseDraft> = {}): MockResponseDraft => ({
	name: 'User Profile - 200',
	method: 'GET',
	urlPattern: '/api/v1/users/me',
	statusCode: '200',
	statusText: 'OK',
	body: '{"id":"user-1"}',
	enabled: true,
	...overrides,
});

interface RenderOverrides {
	draft?: MockResponseDraft;
	onDraftChange?: jest.Mock;
	errors?: Partial<Record<keyof MockResponseDraft, string>>;
	breadcrumbLabel?: string;
	onBreadcrumbBack?: jest.Mock;
	onSave?: jest.Mock;
}

const renderForm = (overrides: RenderOverrides = {}) => {
	const onDraftChange = overrides.onDraftChange ?? jest.fn();
	const onSave = overrides.onSave ?? jest.fn();
	const onBreadcrumbBack = overrides.onBreadcrumbBack ?? jest.fn();
	render(
		<MockResponseForm
			draft={overrides.draft ?? makeDraft()}
			onDraftChange={onDraftChange}
			errors={overrides.errors ?? {}}
			breadcrumbLabel={overrides.breadcrumbLabel ?? 'New mock'}
			onBreadcrumbBack={onBreadcrumbBack}
			onSave={onSave}
		/>,
	);
	return { onDraftChange, onSave, onBreadcrumbBack };
};

describe('MockResponseForm', () => {
	it('renders the title field with the draft name', () => {
		renderForm({ draft: makeDraft({ name: 'User Profile - 200' }) });
		expect(screen.getByDisplayValue('User Profile - 200')).toBeInTheDocument();
	});

	it('calls onDraftChange with the whole next draft (not just the changed field) when the title field changes', () => {
		const draft = makeDraft({ name: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByPlaceholderText('Mock name'), { target: { value: 'X' } });
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, name: 'X' });
	});

	it('shows the name error when provided', () => {
		renderForm({ errors: { name: 'Name is required' } });
		expect(screen.getByText('Name is required')).toBeInTheDocument();
	});

	it('renders "Contains" as fixed text with a tooltip, not an interactive dropdown or button', () => {
		renderForm();
		const contains = screen.getByText('Contains');
		expect(contains).toBeInTheDocument();
		expect(screen.queryByRole('combobox', { name: /contains/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /contains/i })).not.toBeInTheDocument();
		expect(contains.tagName).not.toBe('BUTTON');
	});

	it('calls onDraftChange with the whole next draft when the urlPattern field changes', () => {
		const draft = makeDraft({ urlPattern: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByLabelText('URL pattern'), { target: { value: '/x' } });
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, urlPattern: '/x' });
	});

	it('shows the urlPattern error when provided', () => {
		renderForm({ errors: { urlPattern: 'URL pattern must be a non-empty string' } });
		expect(screen.getByText('URL pattern must be a non-empty string')).toBeInTheDocument();
	});

	it('renders the method Select with the draft method and lets the user change it', async () => {
		const draft = makeDraft({ method: 'GET' });
		const { onDraftChange } = renderForm({ draft });

		const methodSelect = screen.getByRole('combobox', { name: 'Method' });
		expect(methodSelect).toHaveTextContent('GET');

		await userEvent.click(methodSelect);
		await userEvent.click(screen.getByRole('option', { name: 'POST' }));

		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenLastCalledWith({ ...draft, method: 'POST' });
	});

	it('shows the method error when provided, with aria-describedby wired to it for screen readers', () => {
		renderForm({ errors: { method: 'Method must be a valid HTTP method' } });
		const errorText = screen.getByText('Method must be a valid HTTP method');
		expect(errorText).toHaveAttribute('id', 'method-helper-text');
		expect(screen.getByRole('combobox', { name: 'Method' })).toHaveAttribute(
			'aria-describedby',
			'method-helper-text',
		);
	});

	it('does not set aria-describedby on the method Select when there is no method error', () => {
		renderForm();
		expect(screen.getByRole('combobox', { name: 'Method' })).not.toHaveAttribute(
			'aria-describedby',
		);
	});

	it('calls onDraftChange with the whole next draft when the statusCode field changes', () => {
		const draft = makeDraft({ statusCode: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByLabelText('Status Code'), { target: { value: '201' } });
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, statusCode: '201' });
	});

	it('shows the statusCode error when provided', () => {
		renderForm({ errors: { statusCode: 'Status code must be an integer between 100 and 599' } });
		expect(
			screen.getByText('Status code must be an integer between 100 and 599'),
		).toBeInTheDocument();
	});

	it('calls onDraftChange with the whole next draft when the statusText field changes', () => {
		const draft = makeDraft({ statusText: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByLabelText('Status Text'), { target: { value: 'Created' } });
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, statusText: 'Created' });
	});

	it('leaves the response body editor enabled with no disabled caption for a non-null-body status code', () => {
		renderForm({ draft: makeDraft({ statusCode: '200' }) });
		expect(screen.getByLabelText('Response Body')).not.toBeDisabled();
		expect(screen.queryByText(/status 200/)).not.toBeInTheDocument();
	});

	it.each(['204', '205', '304'])(
		'disables the response body editor and shows a caption for status %s',
		(statusCode) => {
			renderForm({ draft: makeDraft({ statusCode }) });
			expect(screen.getByLabelText('Response Body')).toBeDisabled();
			expect(screen.getByText(new RegExp(`status ${statusCode}`))).toBeInTheDocument();
		},
	);

	it('calls onDraftChange with the whole next draft when the body editor changes', () => {
		const draft = makeDraft({ body: '' });
		const { onDraftChange } = renderForm({ draft });
		fireEvent.change(screen.getByLabelText('Response Body'), { target: { value: '{"a":1}' } });
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, body: '{"a":1}' });
	});

	it('shows the body error when provided', () => {
		renderForm({ errors: { body: 'Body must be valid JSON' } });
		expect(screen.getByText('Body must be valid JSON')).toBeInTheDocument();
	});

	it('calls onSave when the Save button is clicked', async () => {
		const { onSave } = renderForm();
		await userEvent.click(screen.getByRole('button', { name: 'Save' }));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('calls onDraftChange with the whole next draft when the enabled switch is toggled', async () => {
		const draft = makeDraft({ enabled: false });
		const { onDraftChange } = renderForm({ draft });
		await userEvent.click(screen.getByRole('switch', { name: 'Enabled' }));
		expect(onDraftChange).toHaveBeenCalledTimes(1);
		expect(onDraftChange).toHaveBeenCalledWith({ ...draft, enabled: true });
	});

	it('does not render the overflow menu button when overflowMenuItems is not provided', () => {
		renderForm();
		expect(screen.queryByRole('button', { name: /more menu/i })).not.toBeInTheDocument();
	});

	it('renders the overflow menu button and its items when overflowMenuItems is provided', async () => {
		render(
			<MockResponseForm
				draft={makeDraft()}
				onDraftChange={jest.fn()}
				errors={{}}
				breadcrumbLabel="User Profile - 200"
				onSave={jest.fn()}
				overflowMenuItems={<li role="menuitem">Delete</li>}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: 'Open more menu' }));
		expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
	});

	it('renders the breadcrumb label', () => {
		renderForm({ breadcrumbLabel: 'User Profile - 200' });
		expect(screen.getByText('User Profile - 200')).toBeInTheDocument();
	});

	it('calls onBreadcrumbBack when the "Mock APIs" breadcrumb segment is clicked', async () => {
		const { onBreadcrumbBack } = renderForm();
		await userEvent.click(screen.getByRole('button', { name: 'Mock APIs' }));
		expect(onBreadcrumbBack).toHaveBeenCalledTimes(1);
	});
});
