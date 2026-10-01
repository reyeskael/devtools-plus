# DevTools Plus

A Chrome extension (Manifest V3) that intercepts a page's API calls and serves back mocked responses — status code, status text and JSON body — without touching the app under test or standing up a server.

Mocks are defined as data, toggled from the extension popup, and applied to `fetch()` and `XMLHttpRequest` calls made by page JavaScript. A global run/stop switch acts as a master kill switch.

Built with React 19 + TypeScript + MUI 9, bundled by Vite via `@crxjs/vite-plugin`, tested with Jest.

## Status

Early scaffold. What works today:

- Popup UI listing mock responses and redirect rules, with per-item enable/delete and a global run switch, persisted to `chrome.storage.local`.
- Working `fetch` and `XMLHttpRequest` interception in the page's main world, driven by the popup's state — serves mocked responses.
- Redirect rules, enforced independently via `chrome.declarativeNetRequest` (DNR) from the background service worker: a request whose URL matches a rule's pattern (wildcard or regex) is sent to a different destination URL instead, including a full editor UI (`/redirects/new`, `/redirects/:id`) for authoring them. See [docs/architecture.md](docs/architecture.md#redirects-the-second-enforcement-path) for the authoring syntax, the CORS limitation, and the dev-mode-only badge caveat.
- Export/Import in the popup toolbar: Export downloads the current items as a `.json` file; Import accepts a `.json` file via a file picker or pasted JSON text.

Not built yet: any UI for creating or editing mocks (the full-page app is a shell for that kind specifically — redirect rules do have a full editor). The `block` and `modify-headers` HTTP rule actions that used to be listed alongside redirect have been **removed entirely**, not deferred — only `redirect` survives, as its own first-class item kind.

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

For a production bundle, use `yarn build` instead and load the same `dist/` folder. If you need to debug a production-shaped build (unminified output with source maps), use `yarn build:debug` instead.

> **Heads up:** the interceptor runs in the page's **main world**, which `@crxjs/vite-plugin` cannot hot-reload. Changes to anything under `src/content/interceptor/` need a manual extension reload (and a page reload) to take effect. Popup and app changes hot-reload normally.

## Scripts

| Command | What it does |
| --- | --- |
| `yarn dev` | Vite dev server with extension HMR |
| `yarn build` | Production build into `dist/` |
| `yarn build:debug` | Production build, unminified with source maps, into `dist/` |
| `yarn test` | Jest test suite |
| `yarn test:watch` | Jest in watch mode |
| `yarn lint` | ESLint over the repo |
| `yarn format` | Prettier write |
| `yarn typecheck` | `tsc --noEmit` |

## Git hooks

A Husky `pre-push` hook runs `yarn test` before every push and blocks it if any test fails. It's installed automatically by the `prepare` script when you run `yarn install` — nothing else to set up. The hook sources `nvm` and runs `nvm use` itself before testing, since git hooks don't inherit your shell's active Node version.

## Architecture

Mocks and redirects are enforced by two independent paths:

- **Mocks** — popup, an ISOLATED-world bridge, and a MAIN-world interceptor, plus the background service worker for the badge — connected by a one-way data flow through `chrome.storage`, with a `postMessage` return leg for the per-tab badge count.
- **Redirects** — popup and the background service worker only: the worker reads the same stored items directly and installs them as `chrome.declarativeNetRequest` (DNR) dynamic rules, which Chrome's own network stack matches and enforces. No content script is involved in enforcing a redirect.

See **[docs/architecture.md](docs/architecture.md)** for the full data flow of both paths, the bootstrap race and how it's resolved, matching semantics, what is and isn't intercepted/redirected, redirect authoring syntax, the CORS limitation on cross-origin redirects, badge behavior (including the dev-mode-only caveat on redirect match counting), the `<all_urls>` permission justification, and the project's file layout.

## Defining mocks and redirects

A fresh install starts from the popup's empty state. For **mocks**, since there's no editor UI yet, the way to get data into the tool is the **Export/Import** feature in the popup toolbar:

- **Export** downloads all current items (mock responses and redirect rules) as a single `.json` file.
- **Import** accepts a `.json` file via a file picker, or pasted JSON text, and replaces whichever of mock responses / redirects are present in the file (a file with only mocks leaves existing redirects untouched, and vice versa). Legacy HTTP-rule JSON from before the redirect feature (`action: 'redirect'` entries) is rejected on import with a clear error rather than migrated.

**Redirect rules** have a full editor UI instead: open the full-page app and use the "Redirect Rules" tab, or the popup's Redirect Rules tab's "+" action, to reach `/redirects/new`. A redirect rule matches a request URL by wildcard or regex pattern and sends it to a static destination URL or a template referencing the pattern's `$1`-`$9` capture groups (`$$` escapes a literal `$`). See [docs/architecture.md](docs/architecture.md#redirect-authoring-syntax) for the full syntax, including why a destination can't be a bare capture ref alone, and the CORS and dev-mode-badge caveats.

`src/shared/items/__fixtures__/sample-mock-responses.json` is a worked example of the import format, used in tests. Each entry is a `MockResponseItem` or `RedirectRuleItem` (`src/shared/items/types.ts`); for a `MockResponseItem`:

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

`storage`, `tabs`, `declarativeNetRequest`, `declarativeNetRequestFeedback`, and `<all_urls>` host permissions. See [docs/architecture.md](docs/architecture.md#permissions-and-all_urls) for what each is used for (the last two power redirect enforcement and its badge counting) and the justification for the broad host permission.
