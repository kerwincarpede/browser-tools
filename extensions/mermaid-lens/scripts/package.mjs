// Zips dist/ into release/<name>-<version>.zip — the file you upload to the
// Chrome Web Store and Microsoft Edge Add-ons.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(path.join(root, 'dist/manifest.json'), 'utf8'));
const slug = manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const out = path.join(root, 'release', `${slug}-${manifest.version}.zip`);
await mkdir(path.dirname(out), { recursive: true });
await rm(out, { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '.*'], { cwd: path.join(root, 'dist'), stdio: 'inherit' });
console.log(`Created ${path.relative(process.cwd(), out)}`);
