# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome extension (Manifest V3) that intercepts a page's `fetch()` and `XMLHttpRequest` calls and serves back mocked responses (status code, status text, JSON body) without touching the app under test or standing up a server. Mocks are defined as data, toggled from the extension popup. Built with React 19 + TypeScript + MUI 7, bundled by Vite via `@crxjs/vite-plugin`, tested with Jest.

Early scaffold: popup UI and interception work; there is no editor UI for mocks yet (edit `src/shared/items/mocks/sample-data.json` directly), and the `block` / `redirect` / `modify-headers` HTTP rules are listed in the popup but not enforced yet (intended to be built on `chrome.declarativeNetRequest`).

## Commands

```bash
nvm use               # Node 24.16.0, per .nvmrc
yarn install
yarn dev               # Vite dev server + extension build into dist/, with HMR
yarn build             # production build into dist/
yarn test              # Jest (ts-jest, jsdom)
yarn test:watch
yarn lint              # ESLint
yarn format            # Prettier write
yarn typecheck         # tsc --noEmit
```

Run a single test file: `yarn test path/to/file.test.ts` (or `-t "test name"` for a name filter). Tests are colocated as `*.test.ts(x)` next to the code they cover — follow that convention for new code.

Loading the extension: `yarn dev` or `yarn build`, then in `chrome://extensions` enable Developer mode → Load unpacked → select `dist/`.

**Heads up:** the interceptor (`src/content/interceptor/`) runs in the page's MAIN world, which `@crxjs/vite-plugin` cannot hot-reload. Changes there need a manual extension reload plus a page reload. Popup and app changes hot-reload normally.

## Architecture

A main-world script has no access to `chrome.*` APIs, and a content script in the isolated world cannot patch the page's globals (`fetch`, `XMLHttpRequest`). The extension is split into three pieces connected by a one-way data flow, all triggered by `chrome.storage.onChanged` — there is no message passing through the background service worker, so nothing races the MV3 service worker lifecycle:

```
popup (usePopupItemsState)
  └─ chrome.storage.local['popupItemsState']
       └─ bridge — isolated content script, chrome.storage.onChanged
            └─ window.postMessage
                 └─ interceptor — MAIN world, patches fetch + XHR
```

1. **Popup** (`src/shared/hooks/usePopupItemsState.ts`) owns `{ mockResponses, httpRules, isRunning }` and persists the whole blob to `chrome.storage.local` on every change.
2. **Bridge** (`src/content/bridge/`) reads that key on load and subscribes to `chrome.storage.onChanged`, posting a rule snapshot into the page on each change.
3. **Interceptor** (`src/content/interceptor/`) replaces `window.fetch` and patches `XMLHttpRequest`, keeping the latest snapshot in a **rule gate** (`ruleGate.ts`).

Both content scripts run at `document_start`, so there's a bootstrap race: a request can fire before the first snapshot arrives. The rule gate **holds** requests until the first snapshot lands, with a 1s timeout after which held requests are released to the real network (with a warning logged). The bridge always posts something — an empty snapshot if storage is empty — so the gate normally opens immediately.

Matching (`src/shared/mocks/matchMock.ts`) is deliberately simple: the first enabled `mock-response` whose method matches and whose `urlPattern` is a **substring** of the resolved request URL wins. When `isRunning` is false, or nothing matches, the request passes through untouched.

**Scope of interception:** patching a realm's globals only covers requests that realm originates. In scope: `fetch()`/`XMLHttpRequest` from page JavaScript, including apps behind a normal caching service worker (the patched global returns the mock before the request reaches the network stack). Out of scope: requests a worker originates itself, subresource loads (`<img>`, `<script>`, `<link>`), navigations, `sendBeacon`, `EventSource`, WebSockets.

### Layout

```
manifest.config.ts        MV3 manifest (typed, via @crxjs/vite-plugin)
vite.config.ts             Build — interceptor is a standalone IIFE for the MAIN world
src/
  popup/                    Toolbar popup: header, tabs, item rows, empty state
  app/                      Full-page app shell (chrome-extension:// tab)
  background/               MV3 service worker
  content/
    bridge/                  ISOLATED world — storage → postMessage
    interceptor/             MAIN world — fetch/XHR patches + rule gate
  shared/
    items/                    Item types, formatters, seed data (sample-data.json)
    mocks/                    Matching + response construction
    messaging/                Cross-world message types and validation
    storage/                  Storage key (kept dependency-free on purpose)
    hooks/                    usePopupItemsState
    chrome/                   openApp helper
    theme.tsx                 MUI theme + provider
```

### Mock data shape

Seed data lives in `src/shared/items/mocks/sample-data.json` and is seeded into the popup on first run only — once the popup has written to `chrome.storage.local`, edits to the JSON won't show up until that stored state is cleared. Each entry is a `MockResponseItem` (`src/shared/items/types.ts`):

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

`storage` and `tabs`, with `<all_urls>` host permissions — the extension is meant to be pointed at whatever page is being debugged, so the content scripts match all URLs.
