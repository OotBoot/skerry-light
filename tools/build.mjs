// Bundles the game into single self-contained HTML files with everything inlined.
//   node tools/build.mjs
// writes dist/skerry-light.html (open directly in any browser)
// and    dist/artifact.html     (the same page without the html/head/body wrapper, for hosts that add their own)

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const MIME = { png: 'image/png', mp3: 'audio/mpeg', webp: 'image/webp' };
const dataUri = p => 'data:' + MIME[p.split('.').pop()] + ';base64,' + readFileSync(join(root, p)).toString('base64');

let html = read('index.html');

html = html.replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`);

const scripts = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>\n?/g)];
if (!scripts.length) throw new Error('no scripts found in index.html');
let js = scripts.map(m => `// ---- ${m[1]} ----\n` + read(m[1])).join('\n');
const foeAssets = readdirSync(join(root, 'assets/foes')).filter(f => f.endsWith('.webp')).map(f => 'assets/foes/' + f);
for (const asset of [...foeAssets, 'assets/maren.png', 'assets/plimsoll.png', 'assets/knock.png', 'assets/verity.png', 'assets/verity2.png', 'assets/verity.mp3']) {
  if (!js.includes(`'${asset}'`)) throw new Error('asset path not found in scripts: ' + asset);
  js = js.split(`'${asset}'`).join(`'${dataUri(asset)}'`);
}
html = html.replace(scripts[0][0], () => `<script>\n${js}\n</script>\n`);
for (const m of scripts.slice(1)) html = html.replace(m[0], () => '');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/skerry-light.html'), html);

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\n?/, '')
  .replace(/<meta name="viewport"[^>]*>\n?/, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(join(root, 'dist/artifact.html'), head.trim() + '\n' + body.trim() + '\n');

console.log('built dist/skerry-light.html and dist/artifact.html', (html.length / 1024).toFixed(0) + ' KB');
