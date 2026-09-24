// Dependency-free storage keys shared between the popup's React hook and the
// content script bridge. Keep this module free of React/hook/seed-data
// imports so the bridge — built as its own minimal chunk for document_start —
// doesn't pull in unrelated code just to read a key name.
export const POPUP_ITEMS_STORAGE_KEY = 'popupItemsState';
