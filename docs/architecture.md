# Architecture

How DevTools Plus gets a mock definition sitting in the popup to actually answer a page's `fetch()`/`XMLHttpRequest` call, and back out again as a badge count. See the main [README](../README.md) for setup, scripts and how to define mocks.

## Why three pieces, not one

A Manifest V3 extension can't patch a page's `fetch`/`XMLHttpRequest` and talk to `chrome.*` APIs from the same piece of code:

- A **MAIN-world** content script runs in the same JS realm as the page, so it's the only place that can replace `window.fetch`/`XMLHttpRequest` and have the page actually see the patched versions — but it has **no access to `chrome.*` at all**.
- An **ISOLATED-world** content script has `chrome.*` access (storage, runtime messaging) and shares the page's DOM, but cannot touch the page's JS globals.
- The **background service worker** has the most privileged `chrome.*` access (e.g. `chrome.action` for the toolbar badge) but no DOM/page access whatsoever, and — being a Manifest V3 service worker — can be killed and restarted by Chrome at any time independent of any tab's lifetime.

So the extension is split into three pieces connected by a one-way data flow:

```
popup (usePopupItemsState)
  └─ chrome.storage.local['popupItemsState']
       └─ bridge — ISOLATED content script, chrome.storage.onChanged
            └─ window.postMessage
                 └─ interceptor — MAIN world, patches fetch + XHR
                      └─ window.postMessage (mock-applied)
                           └─ bridge — chrome.runtime.sendMessage
                                └─ background — chrome.action.setBadgeText
```

Rule delivery (popup → interceptor) never touches the background worker — deliberately, so nothing races the MV3 service worker's unpredictable lifecycle. The background worker only appears on the return leg, because setting the toolbar badge is the one thing here only it can do.

## The three pieces

1. **Popup** (`src/shared/hooks/usePopupItemsState.ts`) owns `{ mockResponses, httpRules, isRunning }` in React state and persists the whole blob to `chrome.storage.local` under `popupItemsState` on every change. `isRunning` is the global kill switch.
2. **Bridge** (`src/content/bridge/index.ts`) — an ISOLATED-world content script, injected on every page. It:
   - reads `popupItemsState` on load and on every `chrome.storage.onChanged`, and `window.postMessage`s a `rules-snapshot` into the page — this is the *outbound* leg.
   - listens for `mock-applied` messages posted back by the interceptor, keeps a running per-page mock count, and forwards the absolute total to the background worker via `chrome.runtime.sendMessage` — this is the *inbound* leg.
   - It's the only piece that talks to both `chrome.storage` and the page's `postMessage` channel, in both directions.
3. **Interceptor** (`src/content/interceptor/`) — a MAIN-world content script that replaces `window.fetch` and patches `XMLHttpRequest`, holding the latest rule snapshot in a **rule gate** (`ruleGate.ts`). On each request it resolves a matching mock (`resolveMock.ts`) and, if one is found, posts a `mock-applied` message back into the page for the bridge to pick up.
4. **Background** (`src/background/service-worker.ts`) — the MV3 service worker. Not part of rule delivery at all. Its only job here is listening for the mock-count message and calling `chrome.action.setBadgeText`/`setBadgeBackgroundColor` for the sending tab (`sender.tab.id`), because `chrome.action` is only callable from a privileged extension context.

## Bootstrap race

Both content scripts run at `document_start`, but the bridge's `chrome.storage.local.get` is asynchronous while the interceptor must patch `fetch` synchronously before any page script can capture a reference to the original. That leaves a few-millisecond window where the patch is installed but has no rules yet.

**Resolution: hold, with a timeout.** The rule gate queues requests that arrive before the first snapshot against a `rulesReady` promise, matching them normally once it resolves. A ~1s timeout releases any still-held requests to the real network (logging a warning) so nothing hangs forever. The bridge always posts *something* on load — an empty snapshot if storage is empty — so in practice the gate opens within milliseconds and the hold path rarely fires.

## Matching semantics

- **URL matching** is a case-sensitive **substring** match against the fully-resolved absolute URL (`src/shared/mocks/matchMock.ts`) — relative URLs are resolved against `document.baseURI` first. No regex, no glob, by design (v1).
- **Method matching** is case-insensitive exact comparison.
- **Tie-break:** the first enabled `mock-response` whose method and pattern match, in array order, wins. Nothing currently enforces single-enablement per pattern.
- When `isRunning` is `false`, or nothing matches, the request passes through to the real network completely unmodified.

## What it does and doesn't catch

Patching a realm's globals only covers requests that realm originates.

- **In scope:** `fetch()` and `XMLHttpRequest` from page JavaScript — including apps behind a normal caching service worker, since the patched global returns the mock before the request ever reaches the network stack (the service worker's `fetch` event never fires).
- **Out of scope:** requests a worker originates itself (background sync, periodic sync, push handlers, install/activate prefetch), subresource loads (`<img>`, `<script>`, `<link>`), navigations, `sendBeacon`, `EventSource` and WebSockets.

## Badge

The extension icon shows a badge counting requests mocked **on the current tab**:

- Counts only requests an enabled mock actually answered — pass-through requests (no match, or the run switch off) don't count.
- Per-tab, not global: a tab where nothing has been mocked shows no badge.
- Resets to blank on a real navigation (content scripts re-inject at `document_start`, restarting the counter), but **not** on an in-app SPA route change, since no navigation occurs there — the count keeps accumulating across those. For a debugging tool, "calls mocked since this page loaded" is the useful number.
- Flipping the run switch off stops new counting immediately, but doesn't retroactively clear a badge already showing a count from earlier in the session — that only happens on the next navigation.

## Permissions and `<all_urls>`

- **`storage`** — persists the popup's mock/rule list and run switch to `chrome.storage.local`, and lets the bridge read it.
- **`tabs`** — lets the background service worker set a per-tab badge via `chrome.action`, keyed off `sender.tab.id`.
- **`<all_urls>` host permissions**, matched by both content scripts (`manifest.config.ts`) — the broadest permission the extension asks for, so it's worth spelling out exactly what runs and why: the bridge and interceptor are injected on every page at `document_start`, but neither does anything unless a stored mock or a stored `enabled: true` HTTP rule targets the current request — with nothing configured, a page runs completely unaffected. `<all_urls>` exists solely so the extension works on whatever page the user is currently debugging, without a manifest edit or a per-site allowlist; an allowlist would defeat the point of a general-purpose debugging tool. This paragraph is the intended starting point for a Chrome Web Store "broad host permission" justification, if this extension is ever submitted there.

## Project structure

```
manifest.config.ts            MV3 manifest (typed, via @crxjs/vite-plugin)
vite.config.ts                Build — interceptor is a standalone IIFE for MAIN world
src/
  popup/                      Toolbar popup: header, tabs, item rows, empty state
  app/                        Full-page app shell (chrome-extension:// tab)
  background/                 MV3 service worker
  content/
    bridge/                   ISOLATED world — storage <-> postMessage, both directions
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
