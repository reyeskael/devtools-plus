import { createContext, useContext, type ReactNode } from 'react';
import { useItemsState, type UseItemsState } from '../hooks/useItemsState';

/**
 * Exported (rather than kept module-private) so tests can render a component tree against a
 * controlled `UseItemsState` value via `<ItemsStateContext.Provider value={...}>`, without going
 * through real `chrome.storage` hydration.
 */
export const ItemsStateContext = createContext<UseItemsState | null>(null);

/**
 * Hydrates {@link useItemsState} once and shares it with every descendant via context, so the
 * popup and app trees can read/mutate items state directly instead of having it threaded down
 * through props (or, for the app's route pages, re-hydrated from scratch on every navigation).
 *
 * @param props.children - The tree that should share this single items-state instance.
 * @returns A provider wrapping `children`.
 */
export const ItemsStateProvider = ({ children }: { children: ReactNode }) => {
	const itemsState = useItemsState();
	return <ItemsStateContext.Provider value={itemsState}>{children}</ItemsStateContext.Provider>;
};

/**
 * Reads the shared {@link useItemsState} instance provided by {@link ItemsStateProvider}.
 *
 * @returns The current items state and its mutators.
 * @throws If called outside an {@link ItemsStateProvider}.
 */
export const useItemsStateContext = (): UseItemsState => {
	const context = useContext(ItemsStateContext);
	if (!context) {
		throw new Error('useItemsStateContext must be used within an ItemsStateProvider');
	}
	return context;
};
