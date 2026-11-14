# Browser extensions

Chrome & Microsoft Edge extensions, one folder per extension under `extensions/`.

| Extension | What it does |
| --- | --- |
| [Mermaid Lens](extensions/mermaid-lens) | Pan, zoom, full-screen, highlight, animate and copy Mermaid diagrams on GitHub (and any site you opt into). |

## Working in this repo

Requires Node 22+.

```sh
npm install          # installs every extension's dependencies (npm workspaces)
npm run build        # builds each extension into extensions/<name>/dist
npm test             # end-to-end tests (Playwright loads the real extension)
npm run package      # typecheck + build + zip into extensions/<name>/release/
```

Run `npx playwright install chromium` once before the first `npm test`.

### Adding another extension

1. Create `extensions/<name>/` with its own `package.json` (`build`, `test`, `typecheck`, `package` scripts) and `manifest.json`.
   Copying `extensions/mermaid-lens/scripts/` is the quickest start.
2. `npm install` from the repo root picks it up automatically.

## Publishing

See [docs/publishing.md](docs/publishing.md) for registering with the Chrome Web Store and Microsoft Edge Add-ons and for each release.
