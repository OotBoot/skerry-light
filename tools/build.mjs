// Bundles the game into single self-contained HTML files with everything inlined.
//   node tools/build.mjs
// writes dist/skerry-light.html (open directly in any browser)
// and    dist/web.html          (what the server sends: the same without the sound inlined, which it serves as files)
// and    dist/artifact.html     (the same page without the html/head/body wrapper, for hosts that add their own). The
//                                claude.ai artifact can't hold the page past 16 MB, so in it the music (assets/sfx/boss*,
//                                raid*, gw*) isn't inlined: it's fetched from beside the page, published with it as its
//                                own files (their list: dist/artifact-files.json, {published path: source path})

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants as Z } from 'node:zlib';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const MIME = { png: 'image/png', mp3: 'audio/mpeg', webp: 'image/webp' };
const dataUri = p => 'data:' + MIME[p.split('.').pop()] + ';base64,' + readFileSync(join(root, p)).toString('base64');

let html = read('index.html');

html = html.replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`);

const scripts = [...html.matchAll(/<script src="((?:src|vendor)\/[^"]+)"><\/script>\n?/g)];
if (!scripts.length) throw new Error('no scripts found in index.html');
let js = scripts.map(m => `// ---- ${m[1]} ----\n` + read(m[1])).join('\n');
// The Original (src/original.js) is its own page, src/original.html, inlined as a string (with </ broken up so it can't close this script)
if (!js.includes("'src/original.html'")) throw new Error('src/original.html not referenced in scripts');
js = js.split("'src/original.html'").join(JSON.stringify(read('src/original.html')).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--'));
const foeAssets = readdirSync(join(root, 'assets/foes')).filter(f => f.endsWith('.webp')).map(f => 'assets/foes/' + f);
// the recorded sound effects (src/sfxlist.js names each one)
let sfxAssets = []; try { sfxAssets = readdirSync(join(root, 'assets/sfx')).filter(f => f.endsWith('.mp3')).map(f => 'assets/sfx/' + f); } catch (e) {}
// (and the Chronicle of the Light's recordings, fetched a mission at a time: src/cpaudio.js CP_AUDIO_LAZY names them)
let cpLazy = new Set(); try { cpLazy = new Set(JSON.parse(read('src/cpaudio.js').match(/CP_AUDIO_LAZY = new Set\((\[[^\]]*\])\)/)[1])); } catch (e) {}
const MUSIC = a => /^assets\/sfx\/(boss|raid|gw|fr(?!horn))[a-z0-9]*_\d+\.mp3$/.test(a) || cpLazy.has((a.match(/^assets\/sfx\/([a-z0-9_]+?)_\d+\.mp3$/) || [])[1]);
let jsArt = null;
// The served page (dist/web.html, what the server sends) inlines everything but the sound: each recording stays a file of
// its own, fetched after the page is up and kept by the browser for good (the ?v= fingerprint changes when the file does),
// so the page is about 2 MB instead of 15, and a new version re-downloads only that. The game plays its synthesised
// sounds until a recording arrives (src/sfxbank.js), the same as it always has while decoding.
const AUDIO = a => a.endsWith('.mp3');
let jsWeb = js;
for (const asset of [...foeAssets, ...sfxAssets, 'assets/maren.png', 'assets/plimsoll.png', 'assets/knock.png', 'assets/verity.png', 'assets/verity2.png', 'assets/verity.mp3']) {
  if (!js.includes(`'${asset}'`)) throw new Error('asset path not found in scripts: ' + asset);
  if (MUSIC(asset) && jsArt === null) jsArt = js;
  if (AUDIO(asset)) jsWeb = jsWeb.split(`'${asset}'`).join(`'${asset}?v=${createHash('sha1').update(readFileSync(join(root, asset))).digest('hex').slice(0, 10)}'`);
  const d = `'${dataUri(asset)}'`;
  if (!AUDIO(asset)) jsWeb = jsWeb.split(`'${asset}'`).join(d);
  js = js.split(`'${asset}'`).join(d);
  if (jsArt !== null && !MUSIC(asset)) jsArt = jsArt.split(`'${asset}'`).join(d);
}
if (jsArt === null) jsArt = js;
const page = j => { let h = html.replace(scripts[0][0], () => `<script>\n${j}\n</script>\n`); for (const m of scripts.slice(1)) h = h.replace(m[0], () => ''); return h; };
const htmlArt = page(jsArt);
const web = Buffer.from(page(jsWeb));
html = page(js);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/skerry-light.html'), html);
writeFileSync(join(root, 'dist/web.html'), web);
// Its compressed copies too, made here rather than by the server: Render's free plan has a tenth of a CPU, and
// compressing the page as it woke from sleep once took it a minute and a half. (Not kept in git: Render builds its own.)
writeFileSync(join(root, 'dist/web.html.gz'), gzipSync(web, { level: 9 }));
writeFileSync(join(root, 'dist/web.html.br'), brotliCompressSync(web, { params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_SIZE_HINT]: web.length } }));

const head = htmlArt.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\n?/, '')
  .replace(/<meta name="viewport"[^>]*>\n?/, '');
const body = htmlArt.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(join(root, 'dist/artifact.html'), head.trim() + '\n' + body.trim() + '\n');
writeFileSync(join(root, 'dist/artifact-files.json'), JSON.stringify(Object.fromEntries(sfxAssets.filter(MUSIC).map(a => [a, a])), null, 1) + '\n');

console.log('built dist/skerry-light.html', (html.length / 1024).toFixed(0) + ' KB, dist/web.html', (web.length / 1024).toFixed(0) + ' KB, and dist/artifact.html');
