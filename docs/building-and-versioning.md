# Building & versioning

## Scripts

Run from the repo root. Add `-w <extension>` to target one extension
(e.g. `npm run build -w mermaid-lens`).

| Command | What it does |
| --- | --- |
| `npm run build` | Compiles TypeScript with esbuild into `extensions/<name>/dist/`, copies the manifest (with the version from `package.json`), icons, popup and the bundled Mermaid library. |
| `npm run dev -w <name>` | Same, but watches and rebuilds on save. |
| `npm run typecheck` | `tsc` type-check, no output files. |
| `npm test` | Builds, then runs each extension's end-to-end tests. |
| `npm run package` | Typecheck + build + validate the manifest + zip `dist/` into `extensions/<name>/release/<name>-<version>.zip`. **This zip is what you upload to both stores.** |
| `npm run store-assets` | Regenerates store screenshots, promo tiles and the Edge logo into `extensions/<name>/store/assets/`. |
| `npm run versions` | Each extension's current version, last release tag and unreleased commits. |
| `npm run release -- <name> <patch\|minor\|major\|x.y.z>` | Cuts a release (below). |

The packager refuses to zip if the store would reject the upload: wrong
manifest version, version format, description over 132 characters, a missing
128px icon, or files the manifest references that aren't in `dist/`.

## Versions

- **Source of truth:** `extensions/<name>/package.json` → `version`. Never edit
  the version in `manifest.json`; the build overwrites it.
- **Format:** `MAJOR.MINOR.PATCH` (semver). Both stores need every upload's
  version to be **higher than the last one you uploaded**, even if that one was
  rejected. Bump before you re-upload.
  - `patch`: bug fixes (0.1.0 → 0.1.1)
  - `minor`: new features (0.1.1 → 0.2.0)
  - `major`: breaking changes or big redesigns (0.2.0 → 1.0.0)
- **Tags:** `<extension>-v<version>`, e.g. `mermaid-lens-v0.2.0`. Each extension
  in the repo is versioned and released independently.
- **Changelog:** `extensions/<name>/CHANGELOG.md`, generated from commit subjects
  at release time, so write commit subjects that make sense to users
  ("Add PNG export", not "wip").

## Cutting a release

```sh
npm run versions                                   # what's unreleased?
npm run release -- mermaid-lens minor --dry-run    # preview version + changelog
npm run release -- mermaid-lens minor --push       # do it
```

`npm run release` will:

1. Check the working tree is clean and the new tag doesn't exist.
2. Bump `version` in the extension's `package.json` (and `package-lock.json`).
3. Prepend a section to `CHANGELOG.md` listing commits since the last tag.
4. Run the tests (`--skip-tests` to skip), then `npm run package` to make the zip.
   If either fails, the bump is reverted.
5. Commit `release(<name>): v<version>` and create the annotated tag.
6. With `--push`, push the commit and tag. Without it, it prints the push command.
   With `--gh-release`, it also creates the GitHub Release from your machine
   (needs `gh`). Use this when GitHub Actions isn't running (see below).

When the tag reaches GitHub, the **Release** workflow rebuilds the zip in a clean
environment, checks the tag matches `package.json`, and publishes a
**GitHub Release** with the zip and changelog attached. Download that zip, or
use your local `release/` copy, and [upload it to the stores](uploading-to-the-stores.md).

Tip: edit `CHANGELOG.md` before pushing if you want nicer wording. Use
`git commit --amend` and move the tag with `git tag -f -a <tag>`, as long as you
haven't pushed yet.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:
`npm ci` → install Chromium → typecheck → tests → package. The zips are uploaded
as a build artifact, and test screenshots are uploaded if a test fails.

`.github/workflows/release.yml` runs on tags matching `*-v<digits>…`, as described above.
If a release for the tag already exists (made with `--gh-release`), it just re-uploads the zip.

> **Actions on a private repo** use your account's paid minutes. If a run fails
> instantly with *"recent account payments have failed or your spending limit
> needs to be increased"*, either fix it under GitHub → Settings → Billing and
> plans, or make the repo public (Actions are free for public repos). Until then,
> release with `--gh-release` and run `npm test` locally before pushing.

## What's in the zip

```
manifest.json  background.js  detector.js  enhancer.js  popup.html/.css/.js
icons/         vendor/mermaid.min.js  vendor/MERMAID-LICENSE.txt
```

Everything ships inside the package. Manifest V3 forbids loading remote code,
and the code isn't minified so store reviewers can read it.
