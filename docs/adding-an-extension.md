# Adding an extension

Each extension is an npm workspace under `extensions/<name>/` with its own
`package.json`, `manifest.json`, build and tests. The repo-level scripts
(`build`, `test`, `package`, `release`, `versions`) pick it up automatically.

## Quick start (copy Mermaid Lens's tooling)

```sh
mkdir -p extensions/my-tool/{src,icons,assets,scripts,store,test}
cp extensions/mermaid-lens/scripts/{build.mjs,package.mjs} extensions/my-tool/scripts/
cp extensions/mermaid-lens/tsconfig.json extensions/my-tool/
```

1. **`extensions/my-tool/package.json`**: name it the same as the folder,
   start at version `0.1.0`, and keep these script names so the root scripts work:

   ```json
   {
     "name": "my-tool",
     "version": "0.1.0",
     "private": true,
     "type": "module",
     "scripts": {
       "build": "node scripts/build.mjs",
       "dev": "node scripts/build.mjs --watch",
       "typecheck": "tsc -p .",
       "test": "npm run build && node test/e2e.mjs",
       "package": "npm run typecheck && npm run build && node scripts/package.mjs"
     }
   }
   ```

2. **`manifest.json`**: Manifest V3. The `version` field is overwritten from
   `package.json` at build time.
3. **`scripts/build.mjs`**: edit `entryPoints` and `copyStatic()` to match your
   files. Remove the Mermaid copy step if you don't need it.
4. **Icons**: draw `assets/icon.svg`, then render 16/32/48/128 PNGs:
   `for s in 16 32 48 128; do rsvg-convert -w $s -h $s assets/icon.svg -o icons/icon-$s.png; done`
   Detailed artwork turns to mush at 16/32px; if it does, draw simplified
   `assets/icon-16.svg` / `assets/icon-32.svg` for those sizes (see Mermaid Lens's
   `npm run icons`).
5. Add `CHANGELOG.md` (`# Changelog`), `PRIVACY.md`, `store/listing.md` and a `README.md`.
6. Add a row to the table in the root `README.md`.
7. `npm install` at the root to register the workspace, then `npm run build -w my-tool`.

## Conventions

- Ask for as few permissions as possible. Prefer `activeTab` plus
  `optional_host_permissions` over broad `host_permissions`; it makes store
  review faster and users more willing to install.
- Bundle every dependency. No CDN scripts (Manifest V3 bans remote code).
- Keep shipped code unminified so reviewers can read it.
- The first store submission is manual in each store; see
  [uploading to the stores](uploading-to-the-stores.md).
