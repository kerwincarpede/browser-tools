// Serves the sample page on http://localhost:8787 (override with PORT=...).
//   npm run sample -w mermaid-lens
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { samplePage } from './page.mjs';

const port = Number(process.env.PORT) || 8787;
const mermaidJs = path.join(path.dirname(fileURLToPath(import.meta.resolve('mermaid/package.json'))), 'dist/mermaid.min.js');

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(samplePage());
      } else if (url.pathname === '/vendor/mermaid.min.js') {
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
        res.end(await readFile(mermaidJs));
      } else {
        res.writeHead(404).end('Not found');
      }
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Mermaid Lens sample page: http://localhost:${port}/`);
    console.log('Turn the extension on for localhost from its toolbar popup, then reload the page.');
  });
