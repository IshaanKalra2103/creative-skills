#!/usr/bin/env node
// Zero-dependency static server for a painting folder (the page itself works from file://; the screenshot script needs http).
//   node serve.mjs [dir=.] [port=5173]
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {extname, join, normalize, resolve} from 'node:path';

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json'};

export function serve(dir, port = 0) {
  const root = resolve(dir);
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
      try {
        const body = await readFile(file);
        res.writeHead(200, {'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
        res.end(body);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    }).listen(port, '127.0.0.1', () => ok(server));
  });
}

// run directly (compare real paths: the skill folder is often a symlink, and import.meta.url is resolved)
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const [dir = '.', port = '5173'] = process.argv.slice(2);
  const s = await serve(dir, +port);
  console.log(`painting → http://localhost:${s.address().port}`);
}
