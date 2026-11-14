// Builds the extension into dist/ (load this folder unpacked in Chrome/Edge).
//   node scripts/build.mjs           one-off production build
//   node scripts/build.mjs --watch   rebuild on change
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'vendor'), { recursive: true });

async function copyStatic() {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  manifest.version = pkg.version; // package.json is the single source of truth
  await writeFile(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await cp(path.join(root, 'icons'), path.join(dist, 'icons'), { recursive: true });
  await cp(path.join(root, 'src/popup/popup.html'), path.join(dist, 'popup.html'));
  await cp(path.join(root, 'src/popup/popup.css'), path.join(dist, 'popup.css'));
  // Resolve through node so this works with npm workspaces (hoisted node_modules).
  const mermaidRoot = path.dirname(fileURLToPath(import.meta.resolve('mermaid/package.json')));
  await cp(path.join(mermaidRoot, 'dist/mermaid.min.js'), path.join(dist, 'vendor/mermaid.min.js'));
  await cp(path.join(mermaidRoot, 'LICENSE'), path.join(dist, 'vendor/MERMAID-LICENSE.txt'));
}

const options = {
  absWorkingDir: root,
  entryPoints: {
    background: 'src/background.ts',
    detector: 'src/detector.ts',
    enhancer: 'src/enhancer/index.ts',
    popup: 'src/popup/popup.ts',
  },
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: ['chrome121'],
  minify: false, // store reviewers prefer readable code; size is dominated by Mermaid anyway
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
};

await copyStatic();
if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching for changes… (reload the extension in chrome://extensions after edits)');
} else {
  await esbuild.build(options);
}
