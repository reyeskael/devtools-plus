import { Container, MenuItem } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { RedirectRuleForm } from '../components/RedirectRuleForm';
import { createItemId } from '../../shared/items/createItemId';
import {
	toRedirectRuleItem,
	validateRedirectRuleDraft,
} from '../../shared/items/redirectRuleDraft';
import type { RedirectRuleDraft } from '../../shared/items/redirectRuleDraft';
import { useItemsStateContext } from '../../shared/context/ItemsStateContext';
import type { RedirectRuleItem } from '../../shared/items/types';

interface RedirectRuleEditorPageProps {
	id?: string;
}

const EMPTY_DRAFT: RedirectRuleDraft = {
	name: '',
	matchType: 'wildcard',
	urlPattern: '',
	destination: '',
	enabled: true,
};

/** Builds an edit-mode draft's initial field values from the existing redirect rule item. */
const draftFromItem = (item: RedirectRuleItem): RedirectRuleDraft => ({
	name: item.name,
	matchType: item.matchType,
	urlPattern: item.urlPattern,
	destination: item.destination,
	enabled: item.enabled,
});

/**
 * The redirect rule create/edit editor, distinguished by whether `id` is provided rather than
 * by parsing the route itself.
 *
 * @param props.id - The redirect rule's id in edit mode; omitted in create mode.
 * @returns The editor UI, or nothing while the initial `useItemsStateContext` hydration is pending or
 * after redirecting away from a stale id.
 */
export const RedirectRuleEditorPage = ({ id }: RedirectRuleEditorPageProps) => {
	const { redirects, hasHydrated, upsertRedirect, removeItem } = useItemsStateContext();
	const [, setLocation] = useLocation();

	const existingItem = id ? redirects.find((item) => item.id === id) : undefined;
	const notFound = hasHydrated && id !== undefined && existingItem === undefined;

	const [draft, setDraft] = useState<RedirectRuleDraft>(EMPTY_DRAFT);
	const [errors, setErrors] = useState<Partial<Record<keyof RedirectRuleDraft, string>>>({});

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
			setLocation('/redirects', { replace: true });
		}
	}, [notFound, setLocation]);

	if (id !== undefined && !hasHydrated) {
		return null;
	}
	if (notFound) {
		return null;
	}

	// Re-validates on every render so the D15 redirect-loop warning stays live as the user edits,
	// independent of the error-setting that only happens on save.
	const liveValidation = validateRedirectRuleDraft(draft);
	const warnings = liveValidation.ok ? liveValidation.warnings : undefined;

	/** Validates the current draft, saving and navigating back on success. */
	const handleSave = () => {
		const result = validateRedirectRuleDraft(draft);
		if (!result.ok) {
			setErrors(result.errors);
			return;
		}
		setErrors({});
		upsertRedirect(toRedirectRuleItem(draft, id ?? createItemId()));
		setLocation('/redirects?saved=1');
	};

	/** Deletes the existing redirect rule and navigates back to the list, in edit mode only. */
	const handleDelete = () => {
		if (id !== undefined) {
			hasDeletedRef.current = true;
			removeItem('redirect', id);
			setLocation('/redirects?deleted=1');
		}
	};

	const breadcrumbLabel = id ? draft.name.trim() || 'Edit redirect rule' : 'New redirect rule';

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<RedirectRuleForm
				draft={draft}
				onDraftChange={setDraft}
				errors={errors}
				warnings={warnings}
				breadcrumbLabel={breadcrumbLabel}
				onBreadcrumbBack={() => setLocation('/redirects')}
				onSave={handleSave}
				overflowMenuItems={
					id ? <MenuItem onClick={handleDelete}>Delete</MenuItem> : undefined
				}
			/>
		</Container>
	);
};
