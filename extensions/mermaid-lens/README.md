# Mermaid Lens

A Chrome / Edge extension that gives Mermaid diagrams on GitHub (and any site you opt into) a proper viewer.

- **Hides GitHub's built-in diagram frame and controls** and redraws the diagram with the bundled Mermaid (v12).
- **Hover toolbar** (top-right): highlight mode · flowing edges · replay build-up · copy/export · full screen · more. Zoom controls bottom-right. The diagram itself is drawn borderless, with solid, softened node outlines and no drop shadows.
- **Pan & zoom**: drag to pan; <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + scroll or trackpad pinch to zoom; plain scrolling still scrolls the page. In full screen, the scroll wheel zooms and trackpad scrolling pans.
- **Highlight** (on by default): hover a node or arrow. *Connected* lights up direct neighbours; *Full flow* lights up everything upstream and/or downstream. Click to pin a highlight, <kbd>Shift</kbd>-click to pin more, <kbd>Esc</kbd> to unpin. The toolbar's highlight button (or <kbd>H</kbd>) cycles *Connected* → *Full flow* → *Off*; direction and colour live under ⋯ → *Highlight options*. Works for flowcharts, state, class and ER diagrams.
- **Highlight colour**: 8 presets plus a custom picker, synced across diagrams and devices.
- **Animate**: *Flowing edges* (marching dashes in the arrow direction; only on highlighted edges while something is highlighted) and *Replay build-up* (nodes appear level by level while edges draw themselves). Both have toolbar buttons; ⋯ → *Animation timing* sets the dash cycle (0.2–3 s) and the build-up length (1–10 s).
- **Copy**: Mermaid code, PNG image, SVG markup; download PNG/SVG; open in Mermaid Live Editor.
- **Per-site switch**: ⋯ menu → *Enabled on github.com*. Turn it back on from the extension icon's popup, which also enables other sites and sets defaults.

Keyboard (diagram focused): <kbd>F</kbd> full screen · <kbd>H</kbd> cycle highlight mode · <kbd>0</kbd> fit · <kbd>+</kbd>/<kbd>−</kbd> zoom · arrows pan · <kbd>Esc</kbd> unpin.

## Try it locally

```sh
npm install            # from the repo root
npm run build -w mermaid-lens   # or: npm run build
```

Then load `extensions/mermaid-lens/dist`:

- **Chrome**: `chrome://extensions` → turn on *Developer mode* → *Load unpacked* → pick the `dist` folder.
- **Edge**: `edge://extensions` → turn on *Developer mode* → *Load unpacked* → pick the `dist` folder.

Open any README with a Mermaid diagram, e.g. https://github.com/mermaid-js/mermaid/blob/develop/README.md.

To try every diagram type and the markup other sites use, run `npm run sample -w mermaid-lens` and open http://localhost:8787/. Turn the extension on for `localhost` from its toolbar popup, then reload. `npm run probe-types -w mermaid-lens` renders the same samples headlessly and prints a support table (screenshots go to `test/screenshots/types/`).

While developing, `npm run dev -w mermaid-lens` rebuilds on save. Click the reload icon on the extension card, then refresh the GitHub tab.

## How it works

| File | Role |
| --- | --- |
| `src/detector.ts` | ~2 KB content script on GitHub. Watches for Mermaid blocks and asks the service worker to inject the heavy parts only when one appears. |
| `src/background.ts` | Injects `vendor/mermaid.min.js` + `enhancer.js`, keeps the toolbar badge (diagram count / "off") and registers content scripts for sites you opt into. |
| `src/enhancer/` | Finds diagrams (`sources.ts`), renders them (`renderer.ts`), and mounts a shadow-DOM viewer per diagram (`viewer.ts`) with pan/zoom, toolbar, highlight (`graph.ts`, `highlight.ts`), animation (`animate.ts`) and export (`export.ts`). |
| `src/popup/` | Per-site switch and default settings. |

Notable details:

- Mermaid renders in `sandbox` mode so text is measured in a blank iframe; otherwise GitHub's CSS (`.label { font-size: 12px }`) shrinks every label's box. The SVG is then sanitised with DOMPurify, just as Mermaid's `strict` mode would. Diagram types that can't render sandboxed (gitGraph) fall back to `strict`.
- Mermaid's `<style>` is moved into a constructable stylesheet inside the shadow root, so strict page CSPs can't block it.
- Edges are matched to nodes by Mermaid's flowchart ids where possible, otherwise geometrically from each path's endpoints.

## Tests

```sh
npx playwright install chromium   # once
npm test -w mermaid-lens          # fixture page served at https://github.com/...
node test/e2e.mjs --live          # also checks a real GitHub README
```

The e2e suite loads the built extension into Chromium and checks rendering, label sizing, highlighting (neighbours, full flow, direction, edges, state/class diagrams), colour sync, zoom/pan, wheel passthrough, clipboard (code + PNG), SVG download, full screen, animations, the per-site switch and dark mode.

## Releasing

Run `npm run release -- mermaid-lens <patch|minor|major> --push` from the repo root, then upload the zip. See [building & versioning](../../docs/building-and-versioning.md) and [uploading to the stores](../../docs/uploading-to-the-stores.md). Store copy and permission justifications live in [store/listing.md](store/listing.md), and the privacy policy in [PRIVACY.md](PRIVACY.md).

Mermaid is © Knut Sveidqvist and contributors, MIT licensed (shipped as `vendor/MERMAID-LICENSE.txt`).
