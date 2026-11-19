# browser-tools

My Chrome & Microsoft Edge extensions, one folder per extension under `extensions/`.

| Extension | What it does |
| --- | --- |
| [Mermaid Lens](extensions/mermaid-lens) | Pan, zoom, expand, highlight, animate and copy Mermaid diagrams on GitHub (and any site you opt into). |

## Quick start

Requires Node 22+.

```sh
npm install                       # all extensions (npm workspaces)
npx playwright install chromium   # once, for tests
npm run build                     # → extensions/<name>/dist  (load this unpacked)
npm test                          # end-to-end tests with the real extension loaded
```

## Scripts

| Command | |
| --- | --- |
| `npm run build` / `npm run dev -w <name>` | Compile into `dist/` (once / on every save) |
| `npm run typecheck` | Type-check everything |
| `npm test` | Build and run end-to-end tests |
| `npm run package` | Validate and zip each extension for the stores → `extensions/<name>/release/` |
| `npm run store-assets` | Regenerate store screenshots, promo tiles and logos |
| `npm run versions` | Current versions, last release tags, unreleased changes |
| `npm run release -- <name> <patch\|minor\|major>` | Bump version, changelog, test, zip, commit, tag (`--push` to publish a GitHub Release) |

## Docs

- [Getting started](docs/getting-started.md): load an extension into Chrome/Edge and the dev loop
- [Building & versioning](docs/building-and-versioning.md): scripts, versions, releases, CI
- [Registering store accounts](docs/registering-store-accounts.md): one-time Chrome Web Store and Edge Add-ons setup
- [Uploading to the stores](docs/uploading-to-the-stores.md): first submission and updates
- [Adding an extension](docs/adding-an-extension.md)
