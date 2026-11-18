// Writes test/sample/diagrams.md: every sample as a ```mermaid fence, for testing on github.com.
//   npm run sample:md -w mermaid-lens
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { samples } from '../fixtures/all-types.mjs';

const github = samples.filter((s) => s.github);
const extra = samples.filter((s) => !s.github);
const block = (s) => `### ${s.title}\n\n\`\`\`mermaid\n${s.code}\n\`\`\`\n`;

const md = `# Mermaid Lens: every diagram type

Open this file on github.com with Mermaid Lens installed. Each block below is a \`mermaid\` code fence, so GitHub renders it and Mermaid Lens should replace GitHub's frame with its own viewer (hover a diagram for the toolbar).

Generated from \`test/fixtures/all-types.mjs\` by \`npm run sample:md -w mermaid-lens\`; edit the fixture, not this file.

## Types GitHub supports

${github.map(block).join('\n')}
## Newer types (Mermaid 12)

GitHub's own renderer may show an error for these; Mermaid Lens bundles Mermaid 12, so it can still draw most of them.

${extra.map(block).join('\n')}`;

await writeFile(fileURLToPath(new URL('./diagrams.md', import.meta.url)), md);
console.log('wrote test/sample/diagrams.md');
