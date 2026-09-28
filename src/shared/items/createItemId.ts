/**
 * Generates a unique id for a new popup item.
 *
 * @returns A random UUID.
 */
export const createItemId = (): string => crypto.randomUUID();
