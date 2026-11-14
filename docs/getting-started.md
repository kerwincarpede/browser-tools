# Getting started

## Prerequisites

- **Node.js 22+** and npm
- **git** and, for releases, the **GitHub CLI** (`gh`)
- **rsvg-convert** (`brew install librsvg`), only needed to re-render icons or store images

## Set up

```sh
git clone git@github.com:<you>/browser-tools.git
cd browser-tools
npm install                         # installs every extension (npm workspaces)
npx playwright install chromium     # once, for tests and store screenshots
npm run build                       # builds each extension into extensions/<name>/dist
```

## Load an extension into your browser

Load the **`dist`** folder, not the extension's source folder.

**Chrome**
1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose `extensions/mermaid-lens/dist`.
4. Pin it from the puzzle-piece menu so its icon (and badge) is visible.

**Microsoft Edge**
1. Go to `edge://extensions`.
2. Turn on **Developer mode** (left sidebar, bottom).
3. Click **Load unpacked** and choose `extensions/mermaid-lens/dist`.

Then open a page with a Mermaid diagram, e.g.
<https://github.com/mermaid-js/mermaid/blob/develop/README.md>, and hover a diagram.

## Edit → reload loop

```sh
npm run dev -w mermaid-lens          # rebuilds dist/ on every save
```

After a change:

| You changed… | Do this |
| --- | --- |
| Content-script / viewer code (`src/enhancer`, `src/detector.ts`) | Click ⟳ on the extension card, then refresh the GitHub tab |
| Popup (`src/popup`) | Close and reopen the popup |
| Service worker (`src/background.ts`) or `manifest.json` | Click ⟳ on the extension card |

Debugging:
- **Viewer / content script:** DevTools on the GitHub tab → Console. Pick the
  extension's context from the dropdown that says "top" to evaluate in its world.
- **Service worker:** `chrome://extensions` → the card's **service worker** link.
- **Popup:** right-click the toolbar icon → **Inspect pop-up**.

> The unpacked extension doesn't update itself. Once you've installed the store
> version, remove the unpacked copy (or keep it in another browser profile) so
> you don't have two Mermaid Lens instances fighting over the same diagrams.

## Tests

```sh
npm test                                            # all extensions
npm test -w mermaid-lens                            # one extension
node extensions/mermaid-lens/test/e2e.mjs --live    # also hit a real GitHub page
HEADED=1 node extensions/mermaid-lens/test/e2e.mjs  # watch the browser
```

The Mermaid Lens tests load the built extension into Playwright's Chromium,
serve a GitHub-shaped page at `https://github.com/...` and drive the real UI.
Screenshots land in `extensions/mermaid-lens/test/screenshots/` (git-ignored).
