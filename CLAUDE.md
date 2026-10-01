# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome extension (Manifest V3) that intercepts a page's `fetch()` and `XMLHttpRequest` calls and serves back mocked responses (status code, status text, JSON body) without touching the app under test or standing up a server. Mocks are defined as data, toggled from the extension popup. Built with React 19 + TypeScript + MUI 9, bundled by Vite via `@crxjs/vite-plugin`, tested with Jest.

Early scaffold: popup and app UI, mock interception, and redirect rules (see below) all work. There is no editor UI for mocks yet (use the popup toolbar's Export/Import feature to get data in and out — see below); redirect rules do have a full editor UI (`/redirects/new`, `/redirects/:id`). The `block` and `modify-headers` HTTP rule actions that used to be listed in the popup have been removed entirely — only `redirect` survives, as its own first-class `kind: 'redirect'` item (see "Redirects" under Architecture below).

## Commands

```bash
nvm use               # Node 24.16.0, per .nvmrc
yarn install
yarn dev               # Vite dev server + extension build into dist/, with HMR
yarn build             # production build into dist/
yarn build:debug       # production build into dist/, unminified with source maps
yarn test              # Jest (ts-jest, jsdom)
yarn test:watch
yarn lint              # ESLint
yarn format            # Prettier write
yarn typecheck         # tsc --noEmit
```

Run a single test file: `yarn test path/to/file.test.ts` (or `-t "test name"` for a name filter). Tests are colocated as `*.test.ts(x)` next to the code they cover — follow that convention for new code.

Loading the extension: `yarn dev` or `yarn build`, then in `chrome://extensions` enable Developer mode → Load unpacked → select `dist/`.

**Heads up:** the interceptor (`src/content/interceptor/`) runs in the page's MAIN world, which `@crxjs/vite-plugin` cannot hot-reload. Changes there need a manual extension reload plus a page reload. Popup and app changes hot-reload normally.

### Git hooks

A Husky `pre-push` hook (`.husky/pre-push`) runs `yarn test` before every push and blocks it if any test fails. It sources `nvm` and runs `nvm use` itself, since git hooks run in a bare shell without the `.nvmrc` version already active. Installed automatically via the `prepare` script on `yarn install` — no separate setup step.

## Architecture

There are **two independent enforcement paths** — one for `mock-response` items, one for `redirect` items. They share the same popup state and storage key but never talk to each other at runtime; a request is handled by at most one of them (see "Interaction between the two paths" below).

### Mocks: popup → bridge → interceptor

A main-world script has no access to `chrome.*` APIs, and a content script in the isolated world cannot patch the page's globals (`fetch`, `XMLHttpRequest`). Mock delivery is split into three pieces connected by a one-way data flow, all triggered by `chrome.storage.onChanged` — there is no message passing through the background service worker for this path, so nothing races the MV3 service worker lifecycle:

```
popup (ItemsStateContext)
  └─ chrome.storage.local['popupItemsState']
       └─ bridge — isolated content script, chrome.storage.onChanged
            └─ window.postMessage
                 └─ interceptor — MAIN world, patches fetch + XHR
```

1. **Popup** (`src/shared/context/ItemsStateContext.tsx`) owns `{ mockResponses, redirects, isRunning }` and persists the whole blob to `chrome.storage.local` on every change.
2. **Bridge** (`src/content/bridge/`) reads that key on load and subscribes to `chrome.storage.onChanged`, posting a rule snapshot (`{ mockResponses, isRunning }` only — `redirects` is deliberately excluded, see below) into the page on each change.
3. **Interceptor** (`src/content/interceptor/`) replaces `window.fetch` and patches `XMLHttpRequest`, keeping the latest snapshot in a **rule gate** (`ruleGate.ts`).

Both content scripts run at `document_start`, so there's a bootstrap race: a request can fire before the first snapshot arrives. The rule gate **holds** requests until the first snapshot lands, with a 1s timeout after which held requests are released to the real network (with a warning logged). The bridge always posts something — an empty snapshot if storage is empty — so the gate normally opens immediately.

Matching (`src/shared/mocks/matchMock.ts`) is deliberately simple: the first enabled `mock-response` whose method matches and whose `urlPattern` is a **substring** of the resolved request URL wins. When `isRunning` is false, or nothing matches, the request passes through untouched.

**Scope of interception:** patching a realm's globals only covers requests that realm originates. In scope: `fetch()`/`XMLHttpRequest` from page JavaScript, including apps behind a normal caching service worker (the patched global returns the mock before the request reaches the network stack). Out of scope: requests a worker originates itself, subresource loads (`<img>`, `<script>`, `<link>`), navigations, `sendBeacon`, `EventSource`, WebSockets — which is exactly the gap the second path below fills.

### Redirects: popup → background → `chrome.declarativeNetRequest`

Redirect rules are enforced by a second, independent path that never touches the bridge or the interceptor: the background service worker reads the same storage key and installs the rules directly as `chrome.declarativeNetRequest` (DNR) **dynamic rules**, which Chrome itself matches and enforces against the network stack.

```
popup (ItemsStateContext)
  └─ chrome.storage.local['popupItemsState']
       └─ background service worker — chrome.storage.onChanged
            └─ chrome.declarativeNetRequest.updateDynamicRules()
                 └─ Chrome's own network stack enforces the redirect
```

- `src/shared/rules/toDnrRules.ts` — pure, chrome-API-free compiler: `(items, isRunning) => chrome.declarativeNetRequest.Rule[]`. `isRunning: false` compiles to an empty rule array, which is how the master toggle gates redirects too.
- `src/shared/rules/pattern.ts` — wildcard-to-regex compilation and the `$1`-`$9` ↔ `\1`-`\9` translation, shared by the compiler and the editor's live pattern tester so both agree on semantics.
- `src/background/syncRedirectRules.ts` — reads storage, calls the compiler, and applies the result via one atomic `updateDynamicRules({ removeRuleIds, addRules })`. Runs once at service-worker module load (the worker can wake up with no fresh install/update event) and again on every `chrome.storage.onChanged` touching the items key.
- This is why `redirects` is excluded from the `RuleSnapshot` posted to the interceptor (`src/shared/messaging/types.ts`): the MAIN-world interceptor never needs to see redirect rules at all.

**Redirect authoring syntax** (`RedirectRuleItem`, `src/shared/items/types.ts`):

- `matchType: 'wildcard' | 'regex'` — a wildcard pattern (`*` matching anything) is compiled to a regex by splitting on `*`, escaping each literal segment, and rejoining with `(.*)`, so every `*` is automatically a capture group; `'regex'` patterns are used as-authored (validated with `chrome.declarativeNetRequest.isRegexSupported()` in the editor, since DNR's regex engine is RE2 — no lookahead, no backreferences).
- `destination` is either a static absolute URL, or a template referencing the pattern's capture groups as `$1`..`$9` (translated to DNR's `\1`..`\9` at the compile boundary). `$$` escapes a literal `$` (so `?amount=$100` isn't mangled). A destination must spell out a literal absolute scheme/host in the template itself — a bare capture ref alone (e.g. `destination: "$1"`) is rejected even when the source pattern guarantees it resolves to something absolute at runtime (see the 2026-10-01 decision log entry in the ticket workspace for why).
- There is **no HTTP-method scoping** on a redirect rule (unlike `mock-response`, which has one `method` field) — a redirect rule applies to every method.
- The editor (`RedirectRuleForm.tsx`, `PatternTester.tsx`) warns, non-blockingly, at save time if a rule's own pattern would match its own destination — a common cause of `ERR_TOO_MANY_REDIRECTS`.
- `condition.resourceTypes` is enumerated explicitly and deliberately **excludes `main_frame`** — a redirect rule can never hijack a page navigation, only subresource/XHR/fetch-style requests.
- Rule precedence follows the popup list's top-to-bottom order (DNR `priority` is derived from list index); rule IDs are a deterministic hash of the item's own id, not a re-allocated counter.

**CORS limitation:** a cross-origin redirect of a `mode: 'cors'` request still has to satisfy CORS at the new destination — DNR redirects do not exempt a request from CORS enforcement or inject `Access-Control-Allow-Origin` on the destination's behalf. If the destination doesn't send that header, the browser blocks the response the same as any other failed cross-origin fetch. This is a structural limitation of the platform and is **not mitigated** — no auto-paired header rule, no editor-time warning. Same-origin redirects (the common debugging case) are unaffected.

**Interaction between the two paths:** if both a `mock-response` and a `redirect` rule could match the same `fetch`/`XHR` request, the mock wins and the request never reaches DNR — the MAIN-world interceptor runs first and returns a mocked response before the request reaches the real network stack where DNR operates. Only requests that *don't* match a mock fall through to `originalFetch`/a real `XMLHttpRequest` send, where DNR can redirect them. A `mock-response` authored against a redirect's destination URL never fires for `fetch`/`XHR`, but subresource/navigation requests (which the interceptor never sees at all) are unaffected by this ordering.

**Badge counting and the dev-mode-only caveat:** the toolbar badge shows `mock count + redirect count` for the current tab. Redirect counts come from `chrome.declarativeNetRequest.onRuleMatchedDebug` (`src/background/redirectBadgeManager.ts`), which Chrome **only fires for unpacked/dev-mode extensions** — there is no non-debug DNR match-feedback API. In a packed Web Store install, the badge would keep counting mocks correctly but always show 0 redirects. This is accepted and documented, not worked around, since devtools-plus is realistically run unpacked. Redirect counts reset on real navigation and are cleaned up on tab close, mirroring how the mock count resets naturally when content scripts re-inject at `document_start`.

### Layout

```
manifest.config.ts        MV3 manifest (typed, via @crxjs/vite-plugin)
vite.config.ts             Build — interceptor is a standalone IIFE for the MAIN world
src/
  popup/                    Toolbar popup: header, tabs, item rows, empty state
  app/                      Full-page app shell (chrome-extension:// tab)
    pages/                    MockApiPage/Row, RedirectRulesPage/Row, editor pages, routes
    components/               MockResponseForm, RedirectRuleForm, PatternTester, EditorTopBar
  background/               MV3 service worker: badge, syncRedirectRules, redirectBadgeManager
  content/
    bridge/                  ISOLATED world — storage → postMessage (mocks only)
    interceptor/             MAIN world — fetch/XHR patches + rule gate
  shared/
    items/                    Item types, formatters, import/export transfer, fixtures, drafts
    mocks/                    Matching + response construction (mock-response only)
    rules/                    Redirect pattern utilities, DNR compiler, preview (DNR enforcement)
    messaging/                Cross-world message types and validation
    storage/                  Storage key (kept dependency-free on purpose)
    context/                  ItemsStateContext — items state as a React Context
    chrome/                   openApp helper
    theme.tsx                 MUI theme + provider
```

### Mock data shape

A fresh install shows the popup's empty state. Data gets into the tool via the popup toolbar's **Export/Import** feature: Export downloads all current items (mock responses and redirect rules) as a `.json` file; Import accepts a `.json` file via a file picker or pasted JSON text, replacing whichever of mock responses / redirects are present in the file (`src/shared/items/transfer.ts` does the parsing/validation, dependency-free of `chrome.*`/DOM). Legacy `action: 'redirect'` entries from the old (pre-redirect-feature) HTTP-rule JSON shape are rejected on import with a clear error rather than silently migrated. `src/shared/items/__fixtures__/sample-mock-responses.json` is a worked example of the import format, used in tests. Each entry is a `MockResponseItem` or `RedirectRuleItem` (`src/shared/items/types.ts`); for a `MockResponseItem`:

```json
{
  "id": "mock-user-profile-200",
  "name": "User Profile - 200",
  "kind": "mock-response",
  "enabled": true,
  "method": "GET",
  "urlPattern": "/api/v1/users/me",
  "statusCode": 200,
  "statusText": "OK",
  "body": { "id": "user-1", "name": "Juan Dela Cruz", "roles": ["admin"] }
}
```

Omit `body` for a bodyless response; statuses that forbid a body (204, 205, 304) are handled automatically.

### Testing notes

jsdom has no global `Request`, which is why the fetch interceptor (`installFetchInterceptor.ts`) duck-types request-like inputs instead of using `instanceof Request`. `jest.setup.ts` installs a mocked `chrome` global (storage, tabs, runtime, action) reset between tests.

### Permissions

`storage`, `tabs`, `declarativeNetRequest`, and `declarativeNetRequestFeedback` (the last two power redirect enforcement and its badge counting, respectively), with `<all_urls>` host permissions — the extension is meant to be pointed at whatever page is being debugged, so the content scripts match all URLs and DNR's redirect authority is unrestricted by host.
