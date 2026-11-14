// Shared helpers for the repo-level scripts.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

export function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { cwd: repoRoot, stdio: 'inherit', ...opts });
}

/** Every folder under extensions/ that has a package.json. */
export function listExtensions() {
  const dir = path.join(repoRoot, 'extensions');
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, 'package.json')))
    .map((d) => loadExtension(d.name));
}

export function loadExtension(name) {
  const dir = path.join(repoRoot, 'extensions', name);
  const pkgPath = path.join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    const known = listExtensionNames().join(', ') || 'none';
    throw new Error(`No extension called "${name}" (known: ${known})`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  return { name, dir, rel: path.relative(repoRoot, dir), pkg, manifest };
}

function listExtensionNames() {
  const dir = path.join(repoRoot, 'extensions');
  return existsSync(dir) ? readdirSync(dir).filter((n) => existsSync(path.join(dir, n, 'package.json'))) : [];
}

/** Tags look like `<extension>-v<version>`, e.g. `mermaid-lens-v1.2.0`. */
export const tagFor = (name, version) => `${name}-v${version}`;

export function latestTag(name) {
  const tags = git('tag', '--list', `${name}-v*`, '--sort=-v:refname');
  return tags.split('\n').filter(Boolean)[0] ?? null;
}

/** Commit subjects that touched the extension since its last release tag. */
export function changesSince(ext, tag) {
  const range = tag ? [`${tag}..HEAD`] : [];
  const log = git('log', ...range, '--no-merges', '--pretty=format:%s', '--', ext.rel);
  return log
    .split('\n')
    .filter(Boolean)
    .filter((s) => !s.startsWith(`release(${ext.name})`));
}

export function bump(version, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [major, minor, patch] = version.split('.').map(Number);
  switch (kind) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump "${kind}". Use patch, minor, major or an explicit x.y.z`);
  }
}

/** a > b for x.y.z versions. */
export function isNewer(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
  return false;
}
