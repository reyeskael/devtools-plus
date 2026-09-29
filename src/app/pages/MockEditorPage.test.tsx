import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangeEvent } from 'react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { MockEditorPage } from './MockEditorPage';
import { ItemsStateProvider } from '../../shared/context/ItemsStateContext';
import type { MockResponseItem } from '../../shared/items/types';

jest.mock('../components/JsonEditor', () => ({
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

const STORAGE_KEY = 'popupItemsState';

const existingItem: MockResponseItem = {
	id: 'mr-1',
	name: 'Get users',
	kind: 'mock-response',
	enabled: true,
	method: 'GET',
	urlPattern: '/api/users',
	statusCode: 200,
	statusText: 'OK',
	body: { id: 'user-1' },
};

const seedStorage = (mockResponses: MockResponseItem[] = []) => {
	chrome.storage.local.set({
		[STORAGE_KEY]: { mockResponses, httpRules: [], isRunning: true },
	});
};

/** Renders `MockEditorPage` with the given `id` prop, wired to an in-memory wouter location. */
const renderEditor = (id?: string) => {
	const { hook, history } = memoryLocation({ path: '/mock-api', record: true });
	render(
		<ItemsStateProvider>
			<Router hook={hook}>
				<MockEditorPage id={id} />
			</Router>
		</ItemsStateProvider>,
	);
	return { history: history as string[] };
};

describe('MockEditorPage', () => {
	describe('create mode', () => {
		beforeEach(() => {
			seedStorage([]);
		});

		it('renders the "New mock" breadcrumb and an empty name field', () => {
			renderEditor();
			expect(screen.getByText('New mock')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Mock name')).toHaveValue('');
		});

		it('shows validation errors and does not save when the draft is invalid', async () => {
			renderEditor();
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));
			expect(screen.getByText('Name is required')).toBeInTheDocument();
		});

		it('saves a valid draft as a new item and navigates to /mock-api?saved=1', async () => {
			const { history } = renderEditor();
			await userEvent.type(screen.getByPlaceholderText('Mock name'), 'New mock name');
			await userEvent.type(screen.getByLabelText('URL pattern'), '/api/new');
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(history.at(-1)).toBe('/mock-api?saved=1');
		});

		it('navigates back to /mock-api without saving when the "Mock APIs" breadcrumb is clicked', async () => {
			const { history } = renderEditor();
			await userEvent.type(screen.getByPlaceholderText('Mock name'), 'Abandoned draft');
			await userEvent.type(screen.getByLabelText('URL pattern'), '/api/abandoned');
			await userEvent.click(screen.getByRole('button', { name: 'Mock APIs' }));

			expect(history.at(-1)).toBe('/mock-api');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.mockResponses).toEqual([]);
		});

		it('does not render an overflow "More" menu button', () => {
			renderEditor();
			expect(screen.queryByRole('button', { name: /more menu/i })).not.toBeInTheDocument();
		});

		it('saves a null-body status (e.g. 204) with no body persisted', async () => {
			const { history } = renderEditor();
			await userEvent.type(screen.getByPlaceholderText('Mock name'), 'No content');
			await userEvent.type(screen.getByLabelText('URL pattern'), '/api/no-content');
			const statusCodeField = screen.getByLabelText('Status Code');
			await userEvent.clear(statusCodeField);
			await userEvent.type(statusCodeField, '204');
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(history.at(-1)).toBe('/mock-api?saved=1');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			const savedItem = lastCallPayload.mockResponses[0] as MockResponseItem;
			expect(savedItem.statusCode).toBe(204);
			expect(savedItem.body).toBeUndefined();
			expect(JSON.stringify(savedItem)).not.toContain('"body"');
		});
	});

	describe('edit mode', () => {
		it('initializes the draft from the existing item', () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);
			expect(screen.getByDisplayValue('Get users')).toBeInTheDocument();
			expect(screen.getByLabelText('URL pattern')).toHaveValue('/api/users');
			expect(screen.getByLabelText('Status Code')).toHaveValue('200');
		});

		it('uses the draft name as the breadcrumb label', () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);
			expect(screen.getByText('Get users')).toBeInTheDocument();
		});

		it('saves changes onto the existing item id, replacing rather than appending', async () => {
			seedStorage([existingItem]);
			const { history } = renderEditor(existingItem.id);

			const nameField = screen.getByDisplayValue('Get users');
			await userEvent.clear(nameField);
			await userEvent.type(nameField, 'Updated name');
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(history.at(-1)).toBe('/mock-api?saved=1');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.mockResponses).toEqual([{ ...existingItem, name: 'Updated name' }]);
		});

		it('redirects back to /mock-api when the id does not match any mock response', () => {
			seedStorage([]);
			const { history } = renderEditor('does-not-exist');
			expect(history.at(-1)).toBe('/mock-api');
			expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
		});

		it('does not redirect away while a genuinely async chrome.storage.local.get is still pending, and shows the item once it resolves', async () => {
			seedStorage([existingItem]);
			// Real chrome.storage.local.get is an async browser call; jest.setup.ts's stub invokes
			// its callback synchronously, which is what hid this bug. Deferring the callback by a
			// macrotask here reproduces the genuine race between useItemsState's hydration and
			// MockEditorPage's "not found" check.
			const originalGet = (chrome.storage.local.get as jest.Mock).getMockImplementation();
			(chrome.storage.local.get as jest.Mock).mockImplementationOnce(
				(key: string, callback: (result: Record<string, unknown>) => void) => {
					setTimeout(() => originalGet?.(key, callback), 0);
				},
			);

			const { hook, history } = memoryLocation({
				path: `/mock-api/${existingItem.id}`,
				record: true,
			});
			render(
				<ItemsStateProvider>
					<Router hook={hook}>
						<MockEditorPage id={existingItem.id} />
					</Router>
				</ItemsStateProvider>,
			);

			expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

			await screen.findByDisplayValue('Get users');

			// The crux of the regression: hydration resolving late must not have redirected away
			// from the edit route in the meantime.
			expect(history.at(-1)).toBe(`/mock-api/${existingItem.id}`);
		});

		it('shows validation errors and does not save when the draft is invalid', async () => {
			seedStorage([existingItem]);
			const { history } = renderEditor(existingItem.id);

			const nameField = screen.getByDisplayValue('Get users');
			await userEvent.clear(nameField);
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(screen.getByText('Name is required')).toBeInTheDocument();
			expect(history.at(-1)).toBe('/mock-api');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.mockResponses).toEqual([existingItem]);
		});

		it('renders an overflow "More" menu button', () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);
			expect(screen.getByRole('button', { name: /more menu/i })).toBeInTheDocument();
		});

		it('deletes the item and navigates to /mock-api?deleted=1 when Delete is clicked', async () => {
			seedStorage([existingItem]);
			const { history } = renderEditor(existingItem.id);

			await userEvent.click(screen.getByRole('button', { name: /more menu/i }));
			await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

			// Pins the `hasDeletedRef` guard in MockEditorPage: deleting makes `existingItem` go
			// from found to not-found within the same render pass, which would otherwise also
			// satisfy the pre-existing stale-id `notFound` effect and have it clobber this
			// navigation with a plain, param-less `replace: true` to `/mock-api` (overwriting
			// this same history entry rather than appending a new one). Asserting the full
			// history array, not just its last entry, catches that even if some other change
			// happened to leave the last entry alone but altered the sequence.
			expect(history).toEqual(['/mock-api', '/mock-api?deleted=1']);
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.mockResponses).toEqual([]);
		});

		it('deletes only the targeted item, leaving other mock responses untouched', async () => {
			const otherItem: MockResponseItem = {
				id: 'mr-2',
				name: 'Create order',
				kind: 'mock-response',
				enabled: true,
				method: 'POST',
				urlPattern: '/api/orders',
				statusCode: 201,
			};
			seedStorage([existingItem, otherItem]);
			const { history } = renderEditor(existingItem.id);

			await userEvent.click(screen.getByRole('button', { name: /more menu/i }));
			await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

			expect(history.at(-1)).toBe('/mock-api?deleted=1');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.mockResponses).toEqual([otherItem]);
		});
	});
});
