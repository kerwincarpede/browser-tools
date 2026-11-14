// Validates dist/ and zips it into release/<name>-<version>.zip — the file you
// upload to the Chrome Web Store and Microsoft Edge Add-ons.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.json'), 'utf8'));

// --- checks the stores would otherwise reject the upload for ---
const problems = [];
if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
if (manifest.version !== pkg.version) problems.push(`manifest version ${manifest.version} ≠ package.json ${pkg.version} (rebuild)`);
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version) || manifest.version.split('.').some((n) => +n > 65535))
  problems.push(`version "${manifest.version}" must be 1–4 dot-separated integers ≤ 65535`);
if (manifest.name.length > 75) problems.push('name must be ≤ 75 characters');
if (manifest.description.length > 132) problems.push(`description is ${manifest.description.length} chars (max 132)`);
if (!manifest.icons?.['128']) problems.push('a 128×128 icon is required');
const referenced = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((c) => [...(c.js ?? []), ...(c.css ?? [])]),
].filter(Boolean);
for (const f of referenced) if (!existsSync(path.join(dist, f))) problems.push(`missing file referenced by manifest: ${f}`);
if (problems.length) {
  console.error(`✗ Not packaging:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const slug = pkg.name;
const out = path.join(root, 'release', `${slug}-${manifest.version}.zip`);
await mkdir(path.dirname(out), { recursive: true });
await rm(out, { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '.*'], { cwd: dist, stdio: 'inherit' });
const mb = (statSync(out).size / 1024 / 1024).toFixed(2);
console.log(`✓ ${path.relative(process.cwd(), out)} (${mb} MB) — ready to upload to both stores`);
