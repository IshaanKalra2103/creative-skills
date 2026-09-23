#!/usr/bin/env node
// List a GLB's node tree with the names three.js will give them (GLTFLoader sanitises names and
// de-duplicates with _1, _2 … in load order), so stage regexes and track paths match. No deps.
//   node glb-parts.mjs model.glb
import {readFileSync} from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node glb-parts.mjs model.glb'); process.exit(1); }
const buf = readFileSync(file);
if (buf.toString('utf8', 0, 4) !== 'glTF') { console.error('not a binary glTF (.glb)'); process.exit(1); }
const j = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));

// PropertyBinding.sanitizeNodeName + GLTFParser.createUniqueName
const used = {};
const unique = (name) => {
  const s = name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
  if (s in used) return `${s}_${++used[s]}`;
  used[s] = 0;
  return s;
};

const verts = (meshIndex) => j.meshes[meshIndex].primitives.reduce((n, p) => n + (j.accessors[p.attributes.POSITION]?.count || 0), 0);
const lines = [];
const walk = (i, depth) => {
  const n = j.nodes[i];
  const name = n.name ? unique(n.name) : '(unnamed)';
  const mesh = n.mesh !== undefined ? `  mesh ${verts(n.mesh).toLocaleString()} verts` : '';
  const kids = n.children?.length ? `  ${n.children.length} children` : '';
  lines.push(`${'  '.repeat(depth)}${name}${mesh}${kids}`);
  (n.children || []).forEach((c) => walk(c, depth + 1));
};
const scene = j.scenes[j.scene ?? 0];
scene.nodes.forEach((i) => walk(i, 0));

console.log(`${file}: ${j.nodes.length} nodes, ${j.meshes?.length || 0} meshes${j.extensionsUsed ? `, uses ${j.extensionsUsed.join(', ')}` : ''}\n`);
console.log(lines.join('\n'));
console.log('\nA stage regex claims the first matching node and everything under it (e.g. a wheel group).');
