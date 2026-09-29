import { Container, MenuItem } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { MockResponseForm } from '../components/MockResponseForm';
import { createItemId } from '../../shared/items/createItemId';
import {
	toMockResponseItem,
	validateMockResponseDraft,
} from '../../shared/items/mockResponseDraft';
import type { MockResponseDraft } from '../../shared/items/mockResponseDraft';
import { useItemsStateContext } from '../../shared/context/ItemsStateContext';
import type { MockResponseItem } from '../../shared/items/types';

interface MockEditorPageProps {
	id?: string;
}

const EMPTY_DRAFT: MockResponseDraft = {
	name: '',
	method: 'GET',
	urlPattern: '',
	statusCode: '200',
	statusText: '',
	body: '',
	enabled: true,
};

/** Builds an edit-mode draft's initial field values from the existing mock response item. */
const draftFromItem = (item: MockResponseItem): MockResponseDraft => ({
	name: item.name,
	method: item.method,
	urlPattern: item.urlPattern,
	statusCode: String(item.statusCode),
	statusText: item.statusText ?? '',
	body: item.body === undefined ? '' : JSON.stringify(item.body, null, 2),
	enabled: item.enabled,
});

/**
 * The mock response create/edit editor, distinguished by whether `id` is provided rather than
 * by parsing the route itself.
 *
 * @param props.id - The mock response's id in edit mode; omitted in create mode.
 * @returns The editor UI, or nothing while the initial `useItemsState` hydration is pending or
 * after redirecting away from a stale id.
 */
export const MockEditorPage = ({ id }: MockEditorPageProps) => {
	const { mockResponses, hasHydrated, upsertMockResponse, removeItem } = useItemsStateContext();
	const [, setLocation] = useLocation();

	const existingItem = id ? mockResponses.find((item) => item.id === id) : undefined;
	const notFound = hasHydrated && id !== undefined && existingItem === undefined;

	const [draft, setDraft] = useState<MockResponseDraft>(EMPTY_DRAFT);
	const [errors, setErrors] = useState<Partial<Record<keyof MockResponseDraft, string>>>({});

	/**
	 * Applies the existing item to the draft the first time it's found, keyed by id so a later
	 * external `chrome.storage.onChanged` update (e.g. from another tab) doesn't clobber the
	 * user's in-progress edits.
	 */
	const appliedItemIdRef = useRef<string | undefined>(undefined);
	useEffect(() => {
		if (existingItem && appliedItemIdRef.current !== existingItem.id) {
			setDraft(draftFromItem(existingItem));
			appliedItemIdRef.current = existingItem.id;
		}
	}, [existingItem]);

	/**
	 * Guards the stale-id redirect below from also firing right after a self-initiated delete,
	 * which likewise makes `existingItem` (and so `notFound`) go from found to not-found — but
	 * `handleDelete` has already navigated away with its own, more specific query param.
	 */
	const hasDeletedRef = useRef(false);

	useEffect(() => {
		if (notFound && !hasDeletedRef.current) {
			setLocation('/mock-api', { replace: true });
		}
	}, [notFound, setLocation]);

	if (id !== undefined && !hasHydrated) {
		return null;
	}
	if (notFound) {
		return null;
	}

	/** Validates the current draft, saving and navigating back on success. */
	const handleSave = () => {
		const result = validateMockResponseDraft(draft);
		if (!result.ok) {
			setErrors(result.errors);
			return;
		}
		setErrors({});
		upsertMockResponse(toMockResponseItem(draft, id ?? createItemId()));
		setLocation('/mock-api?saved=1');
	};

	/** Deletes the existing mock response and navigates back to the list, in edit mode only. */
	const handleDelete = () => {
		if (id !== undefined) {
			hasDeletedRef.current = true;
			removeItem('mock-response', id);
			setLocation('/mock-api?deleted=1');
		}
	};

	const breadcrumbLabel = id ? draft.name.trim() || 'Edit mock' : 'New mock';

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<MockResponseForm
				draft={draft}
				onDraftChange={setDraft}
				errors={errors}
				breadcrumbLabel={breadcrumbLabel}
				onBreadcrumbBack={() => setLocation('/mock-api')}
				onSave={handleSave}
				overflowMenuItems={id ? <MenuItem onClick={handleDelete}>Delete</MenuItem> : undefined}
			/>
		</Container>
	);
};
