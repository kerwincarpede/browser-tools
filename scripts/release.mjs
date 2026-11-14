// Cut a release of one extension: bump version, update CHANGELOG, test, build,
// zip, commit and tag. Pushing the tag makes GitHub Actions publish a GitHub
// Release with the zip attached (see .github/workflows/release.yml).
//
//   npm run release -- <extension> <patch|minor|major|x.y.z> [--dry-run] [--skip-tests] [--push]
//
// Examples:
//   npm run release -- mermaid-lens patch --dry-run   # show what would happen
//   npm run release -- mermaid-lens minor --push      # release and push
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { bump, changesSince, git, isNewer, latestTag, loadExtension, run, tagFor } from './lib.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [name, kind] = args.filter((a) => !a.startsWith('--'));
const dryRun = flags.has('--dry-run');

if (!name || !kind) {
  console.error('Usage: npm run release -- <extension> <patch|minor|major|x.y.z> [--dry-run] [--skip-tests] [--push]');
  process.exit(1);
}

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

let ext;
try {
  ext = loadExtension(name);
} catch (e) {
  fail(e.message);
}

const current = ext.pkg.version;
let next;
try {
  next = bump(current, kind);
} catch (e) {
  fail(e.message);
}
if (!isNewer(next, current)) fail(`New version ${next} must be greater than ${current}`);

const tag = tagFor(name, next);
if (git('tag', '--list', tag)) fail(`Tag ${tag} already exists`);

const prevTag = latestTag(name);
const changes = changesSince(ext, prevTag);
const date = new Date().toISOString().slice(0, 10);
const notes = (changes.length ? changes : ['Maintenance release']).map((c) => `- ${c}`).join('\n');

console.log(`\n${ext.manifest.name}: ${current} → ${next}  (tag ${tag})`);
console.log(`Changes since ${prevTag ?? 'the beginning'}:\n${notes}\n`);
if (dryRun) {
  console.log('Dry run: nothing was changed.');
  process.exit(0);
}

if (git('status', '--porcelain')) fail('Working tree has uncommitted changes. Commit or stash them first.');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch !== 'main') console.warn(`⚠ Releasing from "${branch}", not main.`);

// 1. Version (npm keeps package-lock.json in sync; the build copies it into manifest.json)
run('npm', ['version', next, '--no-git-tag-version', '--workspace', ext.rel]);

// 2. Changelog
const changelogPath = path.join(ext.dir, 'CHANGELOG.md');
const header = '# Changelog\n';
const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : header;
const body = existing.startsWith(header) ? existing.slice(header.length) : existing;
writeFileSync(changelogPath, `${header}\n## ${next} — ${date}\n\n${notes}\n${body.replace(/^\n*/, '\n')}`);

// 3. Verify, build and zip
try {
  if (!flags.has('--skip-tests')) run('npm', ['test', '--workspace', ext.rel]);
  run('npm', ['run', 'package', '--workspace', ext.rel]);
} catch {
  console.error('\nBuild or tests failed. Reverting the version bump.');
  git('checkout', '--', '.');
  process.exit(1);
}

// 4. Commit and tag
git('add', path.join(ext.rel, 'package.json'), path.join(ext.rel, 'CHANGELOG.md'), 'package-lock.json');
git('commit', '-m', `release(${name}): v${next}`);
git('tag', '-a', tag, '-m', `${ext.manifest.name} ${next}\n\n${notes}`);

const zip = path.join(ext.rel, 'release', `${name}-${next}.zip`);
console.log(`\n✓ Released ${ext.manifest.name} ${next}`);
console.log(`  Zip for the stores: ${zip}`);

if (flags.has('--push')) {
  run('git', ['push']);
  run('git', ['push', 'origin', tag]);
  console.log('  Pushed. GitHub Actions will attach the zip to a GitHub Release.');
} else {
  console.log(`  Push when ready:   git push && git push origin ${tag}`);
}
console.log('  Then upload the zip to the Chrome Web Store and Edge Add-ons (docs/uploading-to-the-stores.md).');
