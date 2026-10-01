import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { RedirectRuleEditorPage } from './RedirectRuleEditorPage';
import { ItemsStateProvider } from '../../shared/context/ItemsStateContext';
import type { RedirectRuleItem } from '../../shared/items/types';

const STORAGE_KEY = 'popupItemsState';

const existingItem: RedirectRuleItem = {
	id: 'redirect-1',
	name: 'Old API redirect',
	kind: 'redirect',
	enabled: true,
	matchType: 'wildcard',
	urlPattern: '/api/v1/*',
	destination: 'https://example.com/v2/$1',
};

const seedStorage = (redirects: RedirectRuleItem[] = []) => {
	chrome.storage.local.set({
		[STORAGE_KEY]: { mockResponses: [], redirects, isRunning: true },
	});
};

/** Renders `RedirectRuleEditorPage` with the given `id` prop, wired to an in-memory wouter location. */
const renderEditor = (id?: string) => {
	const { hook, history } = memoryLocation({ path: '/redirects', record: true });
	render(
		<ItemsStateProvider>
			<Router hook={hook}>
				<RedirectRuleEditorPage id={id} />
			</Router>
		</ItemsStateProvider>,
	);
	return { history: history as string[] };
};

describe('RedirectRuleEditorPage', () => {
	describe('create mode', () => {
		beforeEach(() => {
			seedStorage([]);
		});

		it('renders the "New redirect rule" breadcrumb and an empty pattern field', () => {
			renderEditor();
			expect(screen.getByText('New redirect rule')).toBeInTheDocument();
			expect(screen.getByLabelText('URL pattern')).toHaveValue('');
		});

		it('defaults to the wildcard match type (EMPTY_DRAFT)', () => {
			renderEditor();
			expect(screen.getByRole('combobox', { name: 'Match type' })).toHaveTextContent('Wildcard');
		});

		it('shows validation errors and does not save when the draft is invalid', async () => {
			renderEditor();
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));
			expect(screen.getByText('Name is required')).toBeInTheDocument();
		});

		it('saves a valid draft as a new item and navigates to /redirects?saved=1', async () => {
			const { history } = renderEditor();
			await userEvent.type(screen.getByPlaceholderText('Redirect rule name'), 'New redirect');
			await userEvent.type(screen.getByLabelText('URL pattern'), '/api/new/*');
			await userEvent.type(screen.getByLabelText('Destination'), 'https://example.com/$1');
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(history.at(-1)).toBe('/redirects?saved=1');
		});

		it('navigates back to /redirects without saving when the "Redirect Rules" breadcrumb is clicked', async () => {
			const { history } = renderEditor();
			await userEvent.type(
				screen.getByPlaceholderText('Redirect rule name'),
				'Abandoned draft',
			);
			await userEvent.click(screen.getByRole('button', { name: 'Redirect Rules' }));

			expect(history.at(-1)).toBe('/redirects');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.redirects).toEqual([]);
		});

		it('does not render an overflow "More" menu button', () => {
			renderEditor();
			expect(screen.queryByRole('button', { name: /more menu/i })).not.toBeInTheDocument();
		});

		it('shows the redirect-loop warning live as the user types a self-matching pattern', async () => {
			renderEditor();
			await userEvent.type(screen.getByPlaceholderText('Redirect rule name'), 'Loop rule');
			await userEvent.type(screen.getByLabelText('URL pattern'), '*');
			await userEvent.type(
				screen.getByLabelText('Destination'),
				'https://example.com/sample',
			);

			expect(
				screen.getByText(/This pattern matches its own destination/),
			).toBeInTheDocument();
		});
	});

	describe('edit mode', () => {
		it('initializes the draft from the existing item', () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);
			expect(screen.getByDisplayValue('Old API redirect')).toBeInTheDocument();
			expect(screen.getByLabelText('URL pattern')).toHaveValue('/api/v1/*');
			expect(screen.getByLabelText('Destination')).toHaveValue('https://example.com/v2/$1');
		});

		it('uses the draft name as the breadcrumb label', () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);
			expect(screen.getByText('Old API redirect')).toBeInTheDocument();
		});

		it('saves changes onto the existing item id, replacing rather than appending', async () => {
			seedStorage([existingItem]);
			const { history } = renderEditor(existingItem.id);

			const nameField = screen.getByDisplayValue('Old API redirect');
			await userEvent.clear(nameField);
			await userEvent.type(nameField, 'Updated name');
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(history.at(-1)).toBe('/redirects?saved=1');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.redirects).toEqual([{ ...existingItem, name: 'Updated name' }]);
		});

		it('redirects back to /redirects when the id does not match any redirect rule', () => {
			seedStorage([]);
			const { history } = renderEditor('does-not-exist');
			expect(history.at(-1)).toBe('/redirects');
			expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
		});

		it('does not redirect away while a genuinely async chrome.storage.local.get is still pending, and shows the item once it resolves', async () => {
			seedStorage([existingItem]);
			// Real chrome.storage.local.get is an async browser call; jest.setup.ts's stub invokes
			// its callback synchronously. Deferring the callback by a macrotask here reproduces the
			// genuine race between useItemsStateContext's hydration and the editor's "not found"
			// check (mirrors the regression test for MockEditorPage).
			const originalGet = (chrome.storage.local.get as jest.Mock).getMockImplementation();
			(chrome.storage.local.get as jest.Mock).mockImplementationOnce(
				(key: string, callback: (result: Record<string, unknown>) => void) => {
					setTimeout(() => originalGet?.(key, callback), 0);
				},
			);

			const { hook, history } = memoryLocation({
				path: `/redirects/${existingItem.id}`,
				record: true,
			});
			render(
				<ItemsStateProvider>
					<Router hook={hook}>
						<RedirectRuleEditorPage id={existingItem.id} />
					</Router>
				</ItemsStateProvider>,
			);

			expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

			await screen.findByDisplayValue('Old API redirect');

			// The crux of the regression: hydration resolving late must not have redirected away
			// from the edit route in the meantime.
			expect(history.at(-1)).toBe(`/redirects/${existingItem.id}`);
		});

		it('does not clobber an in-progress edit when an external storage change updates the same item', async () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);

			const nameField = screen.getByDisplayValue('Old API redirect');
			await userEvent.clear(nameField);
			await userEvent.type(nameField, 'In-progress edit');

			// Simulates another tab/instance writing a change to the very same item while this
			// editor has unsaved local edits — e.g. its own `onToggle` on the list page, or the
			// popup. The `appliedItemIdRef` guard (keyed by id, not by object identity) must not
			// re-apply `draftFromItem` just because `existingItem`'s reference changed.
			chrome.storage.local.set({
				[STORAGE_KEY]: {
					mockResponses: [],
					redirects: [{ ...existingItem, name: 'Externally changed name' }],
					isRunning: true,
				},
			});

			expect(screen.getByDisplayValue('In-progress edit')).toBeInTheDocument();
			expect(screen.queryByDisplayValue('Externally changed name')).not.toBeInTheDocument();
		});

		it('shows validation errors and does not save when the draft is invalid', async () => {
			seedStorage([existingItem]);
			const { history } = renderEditor(existingItem.id);

			const nameField = screen.getByDisplayValue('Old API redirect');
			await userEvent.clear(nameField);
			await userEvent.click(screen.getByRole('button', { name: 'Save' }));

			expect(screen.getByText('Name is required')).toBeInTheDocument();
			expect(history.at(-1)).toBe('/redirects');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.redirects).toEqual([existingItem]);
		});

		it('renders an overflow "More" menu button', () => {
			seedStorage([existingItem]);
			renderEditor(existingItem.id);
			expect(screen.getByRole('button', { name: /more menu/i })).toBeInTheDocument();
		});

		it('deletes the item and navigates to /redirects?deleted=1 when Delete is clicked', async () => {
			seedStorage([existingItem]);
			const { history } = renderEditor(existingItem.id);

			await userEvent.click(screen.getByRole('button', { name: /more menu/i }));
			await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

			// Pins the `hasDeletedRef` guard: deleting makes `existingItem` go from found to
			// not-found within the same render pass, which would otherwise also satisfy the
			// pre-existing stale-id `notFound` effect and have it clobber this navigation with a
			// plain, param-less `replace: true` to `/redirects`.
			expect(history).toEqual(['/redirects', '/redirects?deleted=1']);
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.redirects).toEqual([]);
		});

		it('deletes only the targeted item, leaving other redirect rules untouched', async () => {
			const otherItem: RedirectRuleItem = {
				id: 'redirect-2',
				name: 'Static asset redirect',
				kind: 'redirect',
				enabled: true,
				matchType: 'wildcard',
				urlPattern: '*.js',
				destination: 'https://localhost:3000/$1',
			};
			seedStorage([existingItem, otherItem]);
			const { history } = renderEditor(existingItem.id);

			await userEvent.click(screen.getByRole('button', { name: /more menu/i }));
			await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

			expect(history.at(-1)).toBe('/redirects?deleted=1');
			const setMock = chrome.storage.local.set as jest.Mock;
			const lastCallPayload = setMock.mock.calls.at(-1)[0][STORAGE_KEY];
			expect(lastCallPayload.redirects).toEqual([otherItem]);
		});
	});
});
