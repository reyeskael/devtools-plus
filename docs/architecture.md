# Architecture

How DevTools Plus gets a mock definition or a redirect rule sitting in the popup to actually take effect on a page, and back out again as a badge count. See the main [README](../README.md) for setup, scripts and how to define mocks and redirects.

There are **two independent enforcement paths**, sharing the same popup state and storage key but never talking to each other at runtime:

- **Mocks** (`kind: 'mock-response'`) — enforced by a MAIN-world interceptor patching `window.fetch`/`XMLHttpRequest`. Described in full below.
- **Redirects** (`kind: 'redirect'`) — enforced by the background service worker installing `chrome.declarativeNetRequest` (DNR) dynamic rules, which Chrome's own network stack matches and enforces. Described in its own section, ["Redirects: the second enforcement path"](#redirects-the-second-enforcement-path), below.

The rest of this document (through "Permissions and `<all_urls>`") describes the **mock** path, which is the original architecture. The redirect path was added later as a structurally different mechanism — read its own section rather than assuming it reuses the pieces below.

## Why three pieces, not one

A Manifest V3 extension can't patch a page's `fetch`/`XMLHttpRequest` and talk to `chrome.*` APIs from the same piece of code:

- A **MAIN-world** content script runs in the same JS realm as the page, so it's the only place that can replace `window.fetch`/`XMLHttpRequest` and have the page actually see the patched versions — but it has **no access to `chrome.*` at all**.
- An **ISOLATED-world** content script has `chrome.*` access (storage, runtime messaging) and shares the page's DOM, but cannot touch the page's JS globals.
- The **background service worker** has the most privileged `chrome.*` access (e.g. `chrome.action` for the toolbar badge) but no DOM/page access whatsoever, and — being a Manifest V3 service worker — can be killed and restarted by Chrome at any time independent of any tab's lifetime.

So the extension is split into three pieces connected by a one-way data flow:

```
popup (ItemsStateContext)
  └─ chrome.storage.local['popupItemsState']
       └─ bridge — ISOLATED content script, chrome.storage.onChanged
            └─ window.postMessage
                 └─ interceptor — MAIN world, patches fetch + XHR
                      └─ window.postMessage (mock-applied)
                           └─ bridge — chrome.runtime.sendMessage
                                └─ background — chrome.action.setBadgeText
```

**Mock** rule delivery (popup → interceptor) never touches the background worker — deliberately, so nothing races the MV3 service worker's unpredictable lifecycle. The background worker only appears on the mock path's return leg, because setting the toolbar badge is the one thing here only it can do. (This is no longer true of rule delivery as a whole: the redirect path below routes through the background worker both ways — see that section.)

## The three pieces

1. **Popup** (`src/shared/context/ItemsStateContext.tsx` — the `useItemsStateContext`/`ItemsStateProvider` pair) owns `{ mockResponses, redirects, isRunning }` in React state and persists the whole blob to `chrome.storage.local` under `popupItemsState` on every change. `isRunning` is the global kill switch, gating both mocks and redirects.
2. **Bridge** (`src/content/bridge/index.ts`) — an ISOLATED-world content script, injected on every page. It:
   - reads `popupItemsState` on load and on every `chrome.storage.onChanged`, and `window.postMessage`s a `rules-snapshot` into the page — this is the *outbound* leg. The posted snapshot (`RuleSnapshot`, `src/shared/messaging/types.ts`) is `{ mockResponses, isRunning }` only — `redirects` is deliberately stripped out here, since the MAIN-world interceptor has no use for it.
   - listens for `mock-applied` messages posted back by the interceptor, keeps a running per-page mock count, and forwards the absolute total to the background worker via `chrome.runtime.sendMessage` — this is the *inbound* leg.
   - It's the only piece that talks to both `chrome.storage` and the page's `postMessage` channel, in both directions.
3. **Interceptor** (`src/content/interceptor/`) — a MAIN-world content script that replaces `window.fetch` and patches `XMLHttpRequest`, holding the latest rule snapshot in a **rule gate** (`ruleGate.ts`). On each request it resolves a matching mock (`resolveMock.ts`) and, if one is found, posts a `mock-applied` message back into the page for the bridge to pick up.
4. **Background** (`src/background/service-worker.ts`) — the MV3 service worker. Not part of *mock* rule delivery at all; here its only job is listening for the mock-count message and calling `chrome.action.setBadgeText`/`setBadgeBackgroundColor` for the sending tab (`sender.tab.id`), because `chrome.action` is only callable from a privileged extension context. (It plays a much bigger role in the redirect path below — reading storage, compiling, and installing DNR rules directly.)

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
- **Out of scope:** requests a worker originates itself (background sync, periodic sync, push handlers, install/activate prefetch), subresource loads (`<img>`, `<script>`, `<link>`), navigations, `sendBeacon`, `EventSource` and WebSockets. Most of the subresource/sub-frame gap here is exactly what the redirect path (DNR) covers instead — see ["Redirects: the second enforcement path"](#redirects-the-second-enforcement-path) below — though DNR can't redirect `sendBeacon`/`EventSource`/WebSockets either, and deliberately excludes navigations (`main_frame`) by choice, not platform limitation.

## Badge

The extension icon shows one combined badge, per tab, summing requests mocked **plus** redirects matched:

- The mock half counts only requests an enabled mock actually answered — pass-through requests (no match, or the run switch off) don't count. It's computed exactly as described above, unaffected by the redirect path.
- The redirect half is driven separately by the background worker (see "Badge counting and the dev-mode-only caveat" in the redirects section below) and summed in with the mock count by `src/background/service-worker.ts`'s `updateBadge`.
- Per-tab, not global: a tab where nothing has been mocked or redirected shows no badge.
- The mock half resets to blank on a real navigation (content scripts re-inject at `document_start`, restarting the counter), but **not** on an in-app SPA route change, since no navigation occurs there — the count keeps accumulating across those. For a debugging tool, "calls mocked since this page loaded" is the useful number. The redirect half is reset on the same navigation signal (`chrome.tabs.onUpdated`), kept in step deliberately.
- Flipping the run switch off stops new counting immediately for both halves (redirects because DNR has no rules installed at all; mocks because nothing matches), but doesn't retroactively clear a badge already showing a count from earlier in the session — that only happens on the next navigation.

## Permissions and `<all_urls>`

- **`storage`** — persists the popup's mock/redirect list and run switch to `chrome.storage.local`, and lets the bridge and the background worker read it.
- **`tabs`** — lets the background service worker set a per-tab badge via `chrome.action`, keyed off `sender.tab.id` (mocks) or the matched request's `tabId` (redirects).
- **`declarativeNetRequest`** — lets the background worker install the redirect dynamic rule set via `chrome.declarativeNetRequest.updateDynamicRules()`. See ["Redirects: the second enforcement path"](#redirects-the-second-enforcement-path) below.
- **`declarativeNetRequestFeedback`** — lets the background worker subscribe to `chrome.declarativeNetRequest.onRuleMatchedDebug` for redirect badge counting. Chrome restricts this event to unpacked/dev-mode extensions — see the dev-mode-only caveat below.
- **`<all_urls>` host permissions**, matched by both content scripts (`manifest.config.ts`) — the broadest permission the extension asks for, so it's worth spelling out exactly what runs and why: the bridge and interceptor are injected on every page at `document_start`, but neither does anything unless a stored mock targets the current request — with nothing configured, a page runs completely unaffected. The redirect path's DNR rules are similarly unrestricted by host so a redirect can be authored against any origin being debugged. `<all_urls>` exists solely so the extension works on whatever page the user is currently debugging, without a manifest edit or a per-site allowlist; an allowlist would defeat the point of a general-purpose debugging tool. This paragraph is the intended starting point for a Chrome Web Store "broad host permission" justification, if this extension is ever submitted there.

## Redirects: the second enforcement path

Everything above this section describes **mock** delivery only. Redirect rules (`kind: 'redirect'`, `src/shared/items/types.ts`) are enforced by a structurally different mechanism that was added later: instead of a content script patching page globals, the **background service worker reads the popup's stored items directly and installs them as `chrome.declarativeNetRequest` (DNR) dynamic rules**, which Chrome's own network stack matches and enforces — no content script, no `postMessage`, no MAIN-world patch involved.

```
popup (ItemsStateContext)
  └─ chrome.storage.local['popupItemsState']
       └─ background service worker — chrome.storage.onChanged
            └─ chrome.declarativeNetRequest.updateDynamicRules()
                 └─ Chrome's own network stack enforces the redirect
```

**Why not the interceptor:** the MAIN-world interceptor only ever sees `fetch()`/`XMLHttpRequest` calls, but redirect rules are most useful against exactly what that path *doesn't* catch — `<script>`/`<img>`/`<link>` subresources, sub-frames, and navigations. DNR operates at the network layer instead, so it naturally covers those. This makes mocks and redirects two genuinely disjoint enforcement paths, not two authoring UIs over one mechanism.

### Pipeline

- `src/shared/rules/pattern.ts` — `wildcardToRegex` (splits a wildcard pattern on `*`, escapes each literal segment, rejoins with `(.*)`, so every `*` becomes a capture group), `dollarRefsToBackslash` (translates a destination template's `$1`-`$9` refs to DNR's `\1`-`\9`, with `$$` escaping a literal `$`), and `hasCaptureRef`. Chrome-API-free, shared by the compiler and the editor's live pattern tester.
- `src/shared/rules/toDnrRules.ts` — the compiler: `(items, isRunning) => chrome.declarativeNetRequest.Rule[]`, pure and fully unit-testable. Picks `condition.urlFilter` (cheap substring match, no RE2 risk) when a pattern needs no regex engine at all, and `condition.regexFilter` otherwise; picks `redirect.url` for a static destination and `redirect.regexSubstitution` for a template with capture refs. `condition.resourceTypes` is enumerated explicitly, deliberately **omitting `main_frame`** so a bad rule can never make a page unreachable by hijacking its own navigation. `priority` is derived from the item's position in the popup's list, so the UI's visual top-to-bottom order is the real evaluation precedence. Rule ids are a deterministic hash of the item's own id (not a re-allocated counter), so a future diff-based update can recognize "this is still the same rule" across syncs. `isRunning: false` short-circuits to an empty rule array — this is how the master kill switch gates redirects.
- `src/shared/rules/previewRedirect.ts` — the editor's live pattern-tester preview. Models DNR's **whole-URL replacement** semantics (the entire matched URL is replaced by the substitution result, not spliced into the matched span), which is the trap that silently drops a request's query string if the destination template doesn't reference it via a capture group.
- `src/background/syncRedirectRules.ts` — reads `chrome.storage.local`, calls `toDnrRules`, and applies the result via one atomic `chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules })` (first reading `getDynamicRules()` to know what to remove). Runs once at service-worker module load — since an MV3 worker can be killed and restarted independent of any tab, and needs to re-establish its rules on waking with no fresh install/update event — and again on every `chrome.storage.onChanged` that touches the popup's items key. Successive syncs are serialized on an internal promise chain so two rapid storage events can't race each other's `getDynamicRules`/`updateDynamicRules` pair into installing conflicting rule sets.
- `src/app/pages/RedirectRulesPage.tsx`, `RedirectRuleRow.tsx`, `RedirectRuleEditorPage.tsx` and `src/app/components/RedirectRuleForm.tsx`, `PatternTester.tsx` — the full-page app's redirect list and editor, at the `/redirects`, `/redirects/new` and `/redirects/:id` routes, patterned on the mock-response editor trio.

### Redirect authoring syntax

A `RedirectRuleItem` has:

- `matchType: 'wildcard' | 'regex'` and `urlPattern` — how the request URL is matched. A wildcard pattern's `*` segments become `$1`-`$9` capture groups automatically; a regex pattern is used as-authored and validated client-side with `chrome.declarativeNetRequest.isRegexSupported()` (DNR's regex engine is RE2: no lookahead, no lookbehind, no backreferences).
- `destination` — either a static absolute URL, or a template referencing `$1`-`$9` capture groups from the pattern (`$$` escapes a literal `$`, so a destination like `?amount=$100` isn't corrupted by a naive digit-ref replace). A destination must contain a literal absolute scheme/host in the template itself; a bare capture ref alone (e.g. `destination: "$1"`) is rejected by the editor's validation even in cases where the source pattern guarantees the capture is itself absolute, since the validator can't tell that case apart from a genuinely relative destination without false-positiving on other inputs.
- No method-scoping field — unlike `mock-response` (which has one `method`), a redirect rule applies to every HTTP method.
- Each rule has its own `enabled` toggle and respects the global `isRunning` switch, same as mocks.

The editor also runs a **non-blocking, save-time redirect-loop check**: it substitutes a sample value into the rule's own destination template and tests that result back against the rule's own pattern. A self-match surfaces a warning (not a hard block, since a deliberately self-referential rule scoped narrowly enough can be legitimate) — this is the common accident that produces `ERR_TOO_MANY_REDIRECTS`.

### CORS limitation

A cross-origin redirect of a `mode: 'cors'` request is still subject to CORS at the new destination: **DNR redirects do not exempt a request from CORS enforcement**, and nothing here auto-injects `Access-Control-Allow-Origin` on the destination's behalf. If the destination doesn't send that header, the browser blocks the response exactly as it would for any other failed cross-origin fetch — redirecting the request doesn't change that. This is a structural platform limitation, accepted and **documented rather than mitigated** (no auto-paired header-modification rule, no editor-time warning). Same-origin redirects — the most common debugging use case — are unaffected.

### Interaction with mocks

When both a `mock-response` and a `redirect` rule could match the same `fetch`/`XHR` request, **the mock wins**: the MAIN-world interceptor runs first and, on a match, returns the mocked response before the request ever reaches the real network stack where DNR operates. Only a request the interceptor does *not* mock falls through to a real network call, where DNR can then redirect it. Consequence: a `mock-response` authored against a redirect rule's destination URL never fires for `fetch`/`XHR` traffic. This ordering doesn't affect subresource loads or navigations, since the interceptor never sees those at all regardless of mocks.

### Badge counting and the dev-mode-only caveat

The background worker subscribes to `chrome.declarativeNetRequest.onRuleMatchedDebug`, which supplies the matched request's `tabId`. `src/background/redirectBadgeManager.ts` keeps a `redirectCounts: Map<tabId, number>`, incremented on each match and reset on the same navigation signal (`chrome.tabs.onUpdated` with a new `url` or a `loading` transition) and cleanup signal (`chrome.tabs.onRemoved`) the mock count conceptually resets on. `service-worker.ts` sums this with the mock count for the combined badge (see "Badge" above).

**Known limitation:** `onRuleMatchedDebug` is restricted by Chrome to **unpacked/dev-mode** extensions only — there is no non-debug DNR match-feedback API. In a packed Web Store install, this listener never fires, so the combined badge would keep counting mocks correctly but always report 0 redirects. This is accepted and intentionally not worked around: devtools-plus is realistically always run unpacked as a developer tool, and there is no alternative API to reach for.

## Project structure

```
manifest.config.ts            MV3 manifest (typed, via @crxjs/vite-plugin)
vite.config.ts                Build — interceptor is a standalone IIFE for MAIN world
src/
  popup/                      Toolbar popup: header, tabs, item rows, empty state
  app/                        Full-page app shell (chrome-extension:// tab)
    pages/                    MockApiPage/Row, RedirectRulesPage/Row, editor pages, routes
    components/               MockResponseForm, RedirectRuleForm, PatternTester, EditorTopBar
  background/                 MV3 service worker: badge, syncRedirectRules, redirectBadgeManager
  content/
    bridge/                   ISOLATED world — storage <-> postMessage, both directions (mocks only)
    interceptor/              MAIN world — fetch/XHR patches + rule gate
  shared/
    items/                    Item types, formatters, import/export transfer, fixtures, drafts
    mocks/                    Matching + response construction (mock-response only)
    rules/                    Redirect pattern utilities, DNR compiler, preview (DNR enforcement)
    messaging/                Cross-world message types and validation
    storage/                  Storage key (dependency-free on purpose)
    context/                  ItemsStateContext — items state as a React Context
    chrome/                   openApp helper
    theme.tsx                 MUI theme + provider
```
