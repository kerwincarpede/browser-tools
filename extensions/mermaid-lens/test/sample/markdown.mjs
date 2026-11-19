// Writes test/sample/diagrams.md: every sample as a ```mermaid fence, for testing on github.com.
//   npm run sample:md -w mermaid-lens
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { samples } from '../fixtures/all-types.mjs';

const github = samples.filter((s) => s.github);
const extra = samples.filter((s) => !s.github);
const block = (s) => `### ${s.title}\n\n\`\`\`mermaid\n${s.code}\n\`\`\`\n`;

const md = `# Mermaid Lens: every diagram type

Open this file on github.com with Mermaid Lens installed. Hover a diagram to open the viewer toolbar.

Generated from \`test/fixtures/all-types.mjs\` by \`npm run sample:md -w mermaid-lens\`; edit the fixture, not this file.

## Common GitHub examples

${github.map(block).join('\n')}
## More examples

Mermaid Lens uses its bundled Mermaid 12.3 and ZenUML renderers. GitHub may show a render error for newer syntax when the extension is disabled.

${extra.map(block).join('\n')}`;

await writeFile(fileURLToPath(new URL('./diagrams.md', import.meta.url)), md);
console.log('wrote test/sample/diagrams.md');
