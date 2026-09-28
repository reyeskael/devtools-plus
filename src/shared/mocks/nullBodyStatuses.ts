// Statuses that the Fetch spec forbids from carrying a body ("null body status").
// Passing a non-empty body for one of these throws when constructing a Response.
export const NULL_BODY_STATUSES = new Set([204, 205, 304]);
