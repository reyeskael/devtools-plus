# DevTools Plus

A Chrome extension (Manifest V3) that intercepts a page's API calls and serves back mocked responses — status code, status text and JSON body — without touching the app under test or standing up a server.

Mocks are defined as data, toggled from the extension popup, and applied to `fetch()` and `XMLHttpRequest` calls made by page JavaScript. A global run/stop switch acts as a master kill switch.

Built with React 19 + TypeScript + MUI 9, bundled by Vite via `@crxjs/vite-plugin`, tested with Jest.

## Status

Early scaffold. What works today:

- Popup UI listing mock responses and HTTP rules, with per-item enable/delete and a global run switch, persisted to `chrome.storage.local`.
- Working `fetch` and `XMLHttpRequest` interception in the page's main world, driven by the popup's state.
- Export/Import in the popup toolbar: Export downloads the current items as a `.json` file; Import accepts a `.json` file via a file picker or pasted JSON text.

Not built yet: any UI for creating or editing mocks (the full-page app is a shell), and the HTTP rules (`block` / `redirect` / `modify-headers`) are listed in the popup but not yet enforced — they are the intended job of `chrome.declarativeNetRequest`, a separate feature from mocking.

## Requirements

- Node **24.16.0** (see `.nvmrc` — `nvm use`)
- Yarn
- Chrome (or any Chromium browser) with developer mode available

## Getting started

```bash
nvm use
yarn install
yarn dev        # Vite dev server + extension build into dist/
```

Then load it into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

For a production bundle, use `yarn build` instead and load the same `dist/` folder.

> **Heads up:** the interceptor runs in the page's **main world**, which `@crxjs/vite-plugin` cannot hot-reload. Changes to anything under `src/content/interceptor/` need a manual extension reload (and a page reload) to take effect. Popup and app changes hot-reload normally.

## Scripts

| Command | What it does |
| --- | --- |
| `yarn dev` | Vite dev server with extension HMR |
| `yarn build` | Production build into `dist/` |
| `yarn test` | Jest test suite |
| `yarn test:watch` | Jest in watch mode |
| `yarn lint` | ESLint over the repo |
| `yarn format` | Prettier write |
| `yarn typecheck` | `tsc --noEmit` |

## How interception works

A main-world script has no access to `chrome.*`, and a content script in the isolated world cannot patch the page's globals. So the two are split, with a bridge between them:

```
popup (usePopupItemsState)
  └─ chrome.storage.local['popupItemsState']
       └─ bridge — isolated content script, chrome.storage.onChanged
            └─ window.postMessage
                 └─ interceptor — MAIN world, patches fetch + XHR
```

Both content scripts run at `document_start`. The flow:

1. **Popup** (`src/shared/hooks/usePopupItemsState.ts`) owns `{ mockResponses, httpRules, isRunning }` and persists the whole blob to `chrome.storage.local` on every change.
2. **Bridge** (`src/content/bridge/`) reads that key on load and subscribes to `chrome.storage.onChanged`, posting a rule snapshot into the page on each change. No message passing through the background worker, so nothing races the MV3 service worker lifecycle.
3. **Interceptor** (`src/content/interceptor/`) replaces `window.fetch` and patches `XMLHttpRequest`, keeping the latest snapshot in a **rule gate**.

Because both scripts start before the page does, there is a bootstrap race: a request could fire before the first snapshot arrives. The rule gate handles it by **holding** requests until the first snapshot lands, with a 1s timeout after which held requests are released to the real network (and a warning is logged). The bridge always posts something — an empty snapshot if storage is empty — so the gate normally opens immediately.

Matching (`src/shared/mocks/matchMock.ts`) is deliberately simple: first enabled `mock-response` whose method matches and whose `urlPattern` is a **substring** of the resolved request URL wins. When `isRunning` is false, or nothing matches, the request passes through to the real network untouched.

### What it does and doesn't catch

Patching a realm's globals only covers requests that realm originates. In scope: `fetch()` and `XMLHttpRequest` from page JavaScript — including apps behind a normal caching service worker, since the patched global returns the mock before the request ever reaches the network stack. Out of scope: requests a worker originates itself, subresource loads (`<img>`, `<script>`, `<link>`), navigations, `sendBeacon`, `EventSource` and WebSockets.

## Project structure

```
manifest.config.ts            MV3 manifest (typed, via @crxjs/vite-plugin)
vite.config.ts                Build — interceptor is a standalone IIFE for MAIN world
src/
  popup/                      Toolbar popup: header, tabs, item rows, empty state
  app/                        Full-page app shell (chrome-extension:// tab)
  background/                 MV3 service worker
  content/
    bridge/                   ISOLATED world — storage → postMessage
    interceptor/              MAIN world — fetch/XHR patches + rule gate
  shared/
    items/                    Item types, formatters, import/export transfer, fixtures
    mocks/                    Matching + response construction
    messaging/                Cross-world message types and validation
    storage/                  Storage key (dependency-free on purpose)
    hooks/                    usePopupItemsState
    chrome/                   openApp helper
    theme.tsx                 MUI theme + provider
```

## Defining mocks

There's no seed data anymore — a fresh install shows the popup's empty state. Until there's a full editor UI, the way to get data into the tool is the **Export/Import** feature in the popup toolbar:

- **Export** downloads all current items (mock responses and HTTP rules) as a single `.json` file.
- **Import** accepts a `.json` file via a file picker, or pasted JSON text, and replaces whichever of mock responses / HTTP rules are present in the file (a file with only mocks leaves existing HTTP rules untouched, and vice versa).

`src/shared/items/__fixtures__/sample-mock-responses.json` is a worked example of the import format — used in tests, not bundled as seed data. Each entry is a `MockResponseItem` or `HttpRuleItem` (`src/shared/items/types.ts`); for a `MockResponseItem`:

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
  "body": {
    "id": "user-1",
    "name": "Juan Dela Cruz",
    "roles": ["admin"]
  }
}
```

Omit `body` for a bodyless response. Statuses that forbid a body (204, 205, 304) are handled for you.

## Testing

```bash
yarn test
```

Jest with `ts-jest` and the jsdom environment. Tests are colocated as `*.test.ts(x)` next to the code they cover; follow that convention for new code. Note that jsdom has no global `Request`, which is why the fetch interceptor duck-types request-like inputs instead of using `instanceof Request`.

## Permissions

`storage` and `tabs`, with `<all_urls>` host permissions — the extension is meant to be pointed at whatever page you're debugging, so the content scripts match all URLs.
