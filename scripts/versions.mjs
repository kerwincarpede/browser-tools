// Overview of every extension: current version, last release tag and
// unreleased changes.   npm run versions
import { changesSince, latestTag, listExtensions } from './lib.mjs';

for (const ext of listExtensions()) {
  const tag = latestTag(ext.name);
  const pending = changesSince(ext, tag);
  console.log(`${ext.manifest.name} (${ext.name})`);
  console.log(`  version in package.json  ${ext.pkg.version}`);
  console.log(`  last release tag         ${tag ?? '—'}`);
  console.log(`  unreleased commits       ${pending.length}`);
  for (const c of pending.slice(0, 10)) console.log(`    • ${c}`);
  if (pending.length > 10) console.log(`    … and ${pending.length - 10} more`);
  console.log('');
}
