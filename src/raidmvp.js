// Maren's End, won: the victory screen. When Maren is laid to rest and her pirate token has been taken (by everyone
// standing, or after a while), the raid ends on this instead of the plain card: every player standing together on a
// sunset sea wall in their own outfit, with their calling's weapon in hand; the one with the best night of all of
// them (the MVP) in the middle on a gold step, the rest out to either side by how well they did. Under each one, the
// three things they did best (as against the others, or, alone, the most telling), from a little list of things
// counted all the way down: the drowned sent back, through the head, damage to the bosses, hits on Maren's
// soul, friends got up, metres sprinted, time by a brazier's light, time in the air, grenades thrown, and so on.
// Then: spend your pirate token (the Gannet's Locker, src/zmegg.js ptShow), play again, or back to the main menu.
//
// The counting (rmvTick, each frame from raidMe; rmvShot from zmResolveShot; rmvAdd from the stages): each player
// counts their own, on their own side. Together (src/zmnet.js), once Maren falls each player's presence carries
// `ms` (their counts) and `mt` (whether they've taken her token); the host gathers everyone's into one list and sends
// it in its word (`mv`) until the screen is up, then holds it, so every screen shows the very same people, order and
// lines. Joined players draw from the host's list (their own, until it arrives).
// The figures are src/fpsbody.js's (fbFigure, fbPose), in a little three.js scene of their own on the screen's own
// canvas (its own renderer, let go when the screen goes). Without WebGL, the cards alone.
// Hooks (// [mvp]): raidMe (rmvTick), raidStamina (RAID.runNow), raidShowOver (rmvShow), raidHostSend (rmvPack),
// raidApply (rmvApply), raidBegin (rmvReset), zmResolveShot (rmvShot), zmnRevive (rmvAdd 'rv'), znPresence
// (rmvPresence), znReadPlayers (rmvHeard), src/raidfort.js (rfShot: rmvAdd 'so'; the wait for the token: rmvAllTook).

// what's counted, in this order everywhere (packed as whole numbers): [key, what it's called, how it's shown, how
// telling it is (for picking the three), at least this much to count]
const RMV_STATS = [
  ['k', 'drowned sent back', v => v, 0.32, 1],
  ['hd', 'through the head', v => v, 0.26, 1],
  ['bd', 'damage to the bosses', v => Math.round(v), 0.26, 5],
  ['so', 'hits on Maren’s soul', v => v, 0.34, 1],
  ['rv', 'friends got back up', v => v, 0.34, 1],
  ['sp', 'sprinted', v => Math.round(v) + ' m', 0.14, 20],
  ['wk', 'walked, in all', v => Math.round(v) + ' m', 0.04, 1],
  ['air', 'in the air', v => rmvTime(v), 0.12, 3],
  ['br', 'by a brazier’s light', v => rmvTime(v), 0.16, 5],
  ['sh', 'shots fired', v => v, 0.06, 1],
  ['acc', 'shots that hit', v => v + '%', 0.2, 1],
  ['mx', 'hit with one shot', v => v, 0.2, 2],
  ['gr', 'grenades thrown', v => v, 0.12, 1],
  ['ul', 'ultimates called', v => v, 0.16, 1],
  ['ob', 'times out of breath', v => v, 0.1, 1],
  ['hs', '', v => v, 0, 1e9],   // (shots that hit something: for the share)
  ['dn', 'times knocked down', v => v, 0, 1e9],   // (counted against you, never one of your three)
];
const RMV_KEYS = RMV_STATS.map(s => s[0]);
const rmvTime = s => s >= 60 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : Math.round(s) + ' s';
const RMV = { s: {}, snap: null, held: false, on: false, key: '', lx: null, ly: null, wasDn: false, gT: 0, uK: 0, r3: null };

function rmvReset() { RMV.s = {}; RMV.snap = null; RMV.held = false; RMV.lx = RMV.ly = null; RMV.wasDn = false; RMV.gT = 0; RMV.uK = 0; rmvHide(); }
function rmvAdd(k, n) { if (typeof RAID === 'undefined' || !RAID.on || ZM.over) return; RMV.s[k] = (RMV.s[k] || 0) + (n == null ? 1 : n); }
// (zmResolveShot) one pull of my trigger, and what it hit
function rmvShot(hits) { if (typeof RAID === 'undefined' || !RAID.on) return; const n = hits ? hits.size : 0; rmvAdd('sh'); if (n) rmvAdd('hs'); if (n > (RMV.s.mx || 0)) RMV.s.mx = n; }
// (raidMe) everyone, each frame: how far, how fast, off the ground, in the light; down; a grenade or an ultimate
function rmvTick(dt) {
  if (!RAID.on || ZM.over) return;
  const m = FPS.me;
  if (!(m.dead > 0) && RMV.lx != null) {
    const d = Math.hypot(m.x - RMV.lx, m.y - RMV.ly);
    if (d < 1.2) { rmvAdd('wk', d); if (RAID.runNow) rmvAdd('sp', d); }   // (more than that in a frame: put somewhere, not walked)
    if ((m.jz || 0) > (m.fl || 0) + 0.08) rmvAdd('air', dt);
    if (RAID_ORDER[RAID.stage] === 'descent' && typeof rswInLight === 'function' && rswInLight(m.x, m.y, m.jz)) rmvAdd('br', dt);
  }
  RMV.lx = m.x; RMV.ly = m.y;
  const dn = typeof zmIsDown === 'function' && zmIsDown();
  if (dn && !RMV.wasDn) rmvAdd('dn'); RMV.wasDn = dn;
  if (typeof RCL !== 'undefined') {
    if ((RCL.gT || 0) > RMV.gT + 1) rmvAdd('gr');
    if (RMV.uK >= 1 && (RCL.uK || 0) < 0.5) rmvAdd('ul');
    RMV.gT = RCL.gT || 0; RMV.uK = RCL.uK || 0;
  }
}
// my counts, packed (the kills and headshots as src/zombies.js keeps them: credited by the host when joined)
function rmvMine() {
  const s = Object.assign({}, RMV.s, { k: ZM.kills | 0, hd: ZM.heads | 0, bd: RAID.boss || 0 });
  if (RAID.tiredN) s.ob = RAID.tiredN;
  s.acc = (s.sh | 0) >= 8 ? Math.round(100 * (s.hs | 0) / s.sh) : 0;
  return RMV_KEYS.map(k => Math.max(0, Math.round((s[k] || 0) * (k === 'air' || k === 'br' ? 10 : 1))));
}
const rmvUnpack = a => Object.fromEntries(RMV_KEYS.map((k, i) => [k, (+(a && a[i]) || 0) / (k === 'air' || k === 'br' ? 10 : 1)]));
const rmvEnded = () => typeof RF !== 'undefined' && RF.on && (RF.st === 'won' || ZM.over);

// ---------- together ----------
function rmvPresence(z) { if (typeof RAID !== 'undefined' && RAID.on && rmvEnded()) { z.ms = rmvMine(); z.mt = RF.mine ? 1 : 0; } }
function rmvHeard(r, z) {
  if (Array.isArray(z.ms)) r.ms = z.ms.slice(0, RMV_KEYS.length).map(v => clamp(+v || 0, 0, 1e7));
  r.mt = !!z.mt;
}
// (hosting) has everyone standing taken her token?
function rmvAllTook() {
  if (!RF.mine && !(FPS.me.dead > 0)) return false;
  for (const r of FPS.remote.values()) if (!r.left && !r.dead && !r.mt) return false;
  return true;
}
// everyone, as one list: [id, name, calling (0 none), outfit, colours, counts]
function rmvGather() {
  const me = FPS.me, nick = ((ZM.hum || []).find(h => h[0] === me.id) || [])[1] || FPS.nick || 'You';
  const cls = typeof RCL !== 'undefined' && RCL.cls ? RCL_ORDER.indexOf(RCL.cls) + 1 : 0;
  const L = [[me.id, String(nick).slice(0, 20), cls, typeof ocEquippedId === 'function' ? ocEquippedId() || '' : '', fpsColours(), rmvMine()]];
  if (ZM.net) for (const r of FPS.remote.values()) {
    if (r.left || !(ZM.hum || []).some(h => h[0] === r.id)) continue;
    L.push([r.id, String(r.n || 'A keeper').slice(0, 20), r.rc ? RCL_ORDER.indexOf(r.rc) + 1 : 0, r.o || '', Array.isArray(r.c) ? r.c : null, r.ms || RMV_KEYS.map(() => 0)]);
  }
  return L;
}
// (raidHostSend) once it's won: the list, gathered afresh until the screen's up, then held
function rmvPack(z) {
  if (!RAID.won || !rmvEnded()) return;
  if (!RMV.held) { RMV.snap = rmvGather(); if (ZM.over && ZM.over.t > 2) RMV.held = true; }
  z.mv = RMV.snap;
}
// (raidApply) joined: the host's list
function rmvApply(hz) {
  if (!Array.isArray(hz.mv)) return;
  const L = hz.mv.filter(p => Array.isArray(p) && typeof p[0] === 'string').slice(0, 8).map(p => [p[0], String(p[1] || '').slice(0, 20), clamp(p[2] | 0, 0, 3), typeof p[3] === 'string' ? p[3].slice(0, 24) : '',
    Array.isArray(p[4]) ? p[4].slice(0, 4).map(c => typeof c === 'string' ? c.slice(0, 9) : '#3a2a1e') : null, Array.isArray(p[5]) ? p[5].slice(0, RMV_KEYS.length).map(v => clamp(+v || 0, 0, 1e7)) : []]);
  if (!L.length) return;
  const k = JSON.stringify(L);
  if (k === RMV.key) return;
  RMV.snap = L;
  if (RMV.on) rmvRender();
}

// ---------- who did best ----------
// the night's worth, for the middle: kills and what helped everyone most, less every time you went down
function rmvScore(s) { return s.k + s.hd * 0.5 + s.bd * 0.15 + s.so * 0.4 + s.rv * 5 + s.mx * 0.5 + s.gr * 0.3 + s.ul * 1.5 + s.br * 0.02 - s.dn * 2; }
// a steady little nudge from a name and a stat (so the same three come up on every screen, and not always the same three)
function rmvJit(id, k) { let h = 2166136261; for (const ch of id + '|' + k) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000 * 0.22; }
// each one's three: what they did most of, against the best of the others (and best of all, better still)
function rmvRank(L) {
  const P = L.map(p => ({ id: p[0], n: p[1], cls: RCL_ORDER[p[2] - 1] || null, o: p[3], col: p[4], s: rmvUnpack(p[5]) }));
  for (const p of P) p.score = rmvScore(p.s);
  P.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  const many = P.length > 1;
  for (const p of P) {
    const c = [];
    for (const [k, , , w, least] of RMV_STATS) {
      const v = p.s[k]; if (!w || !(v >= least)) continue;
      const top = Math.max(...P.map(q => q.s[k])), lead = many && P.every(q => q === p || q.s[k] < v);
      c.push({ k, v, r: v / Math.max(1e-6, top) + (lead ? 0.6 : 0) + w + rmvJit(p.id, k), lead });
    }
    c.sort((a, b) => b.r - a.r);
    p.top = c.slice(0, 3);
    // (too little done to have three: the plain ones, to fill)
    for (const k of ['k', 'wk', 'sh', 'hd']) if (p.top.length < 3 && !p.top.some(t => t.k === k)) p.top.push({ k, v: p.s[k], lead: false });
  }
  return P;
}
// where each stands, by rank: the best in the middle, then out to the left and right in turn
const RMV_X = [0, -1.55, 1.55, -3.1, 3.1, -4.65, 4.65, -6.2];

// ---------- the screen ----------
function rmvStyle() {
  if ($('rmvStyle')) return;
  const st = document.createElement('style'); st.id = 'rmvStyle';
  st.textContent = `
#rmvOver { position: absolute; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: stretch; overflow: hidden auto;
  background: linear-gradient(180deg, #1c1430 0%, #4a2440 26%, #a8483a 50%, #e88a48 62%, #2a2230 63.5%, #120e16 100%); color: #ece4cf; }
#rmvOver[hidden] { display: none; }
#rmvOver .rmvhead { text-align: center; padding: 18px 16px 0; position: relative; z-index: 2; }
#rmvOver .eyebrow { color: #ffd9a0; }
#rmvOver h1 { margin: 4px 0 2px; font-family: "IM Fell English SC", serif; font-weight: 400; font-size: clamp(26px, 5vw, 44px); color: #fff0d2; text-shadow: 0 2px 18px rgba(255,140,60,0.5); }
#rmvOver .rmvsub { margin: 0; font-family: "Courier Prime", monospace; font-size: 13px; color: rgba(255,236,210,0.8); }
#rmvOver .rmvstage { position: relative; flex: 1 1 auto; min-height: 380px; }
#rmvOver canvas.rmv3d { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#rmvOver .rmvsun { position: absolute; left: 50%; top: 40%; width: 34vmin; height: 34vmin; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(circle, #fff2c0 0%, #ffc070 40%, rgba(255,140,70,0.35) 62%, rgba(255,120,60,0) 72%); pointer-events: none; }
#rmvOver .rmvcards { position: absolute; inset: 0; pointer-events: none; }
#rmvOver .rmvcard { position: absolute; transform: translateX(-50%); width: var(--w, 180px); padding: 8px 8px 9px; border-radius: 8px; text-align: center;
  background: rgba(14,10,18,0.78); box-shadow: inset 0 0 0 1px rgba(255,214,160,0.22); }
#rmvOver .rmvcard.mvp { background: linear-gradient(180deg, rgba(64,44,12,0.9), rgba(20,14,10,0.88)); box-shadow: inset 0 0 0 1px #e8b84a, 0 0 22px -6px #ffb84a; }
#rmvOver .rmvtag { display: inline-block; font: 700 11px "Courier Prime", monospace; letter-spacing: 0.12em; color: #1a1206; background: #f0c45a; border-radius: 3px; padding: 1px 6px; margin-bottom: 3px; }
#rmvOver .rmvname { display: block; font-family: "IM Fell English SC", serif; font-size: 18px; color: #fff0d2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#rmvOver .rmvcls { display: block; font: 12px "Courier Prime", monospace; margin-bottom: 4px; }
#rmvOver .rmvstat { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font: 12px "Courier Prime", monospace; color: rgba(236,228,207,0.82); text-align: left; border-top: 1px solid rgba(255,214,160,0.12); padding-top: 3px; margin-top: 3px; }
#rmvOver .rmvstat b { font: 700 15px "Courier Prime", monospace; color: #ffe9a8; white-space: nowrap; }
#rmvOver .rmvstat.lead b::after { content: ' ★'; color: #f0c45a; font-size: 11px; }
#rmvOver .rmvbtns { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 12px 16px 20px; position: relative; z-index: 2; }
#rmvOver .rmvbtns button { min-width: 11rem; }
@media (max-width: 640px) {
  #rmvOver .rmvcard { padding: 6px 4px 7px; }
  #rmvOver .rmvname { font-size: 14px; } #rmvOver .rmvcls { font-size: 10px; }
  #rmvOver .rmvstat { display: block; text-align: center; font-size: 10px; } #rmvOver .rmvstat b { display: block; font-size: 13px; }
  #rmvOver .rmvbtns button { min-width: 0; flex: 1 1 100%; }
}`;
  document.head.appendChild(st);
}
function rmvBuild() {
  if ($('rmvOver')) return;
  rmvStyle();
  const ov = document.createElement('div');
  ov.id = 'rmvOver'; ov.hidden = true;
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'rmvHead');
  ov.innerHTML = `<div class="rmvhead"><span class="eyebrow">Maren’s End · won</span><h1 id="rmvHead">Maren is laid to rest</h1><p class="rmvsub" id="rmvSub"></p></div>
    <div class="rmvstage" id="rmvStage"><div class="rmvsun"></div><canvas class="rmv3d" id="rmv3d" aria-hidden="true"></canvas><div class="rmvcards" id="rmvCards"></div></div>
    <div class="rmvbtns">
      <button class="primary" id="rmvToken" type="button">Spend your pirate token</button>
      <button class="tool" id="rmvAgain" type="button">Play again</button>
      <button class="tool" id="rmvMenu" type="button">Main menu</button>
    </div>`;
  const at = $('zmOver');
  if (at && at.parentNode) at.parentNode.insertBefore(ov, at.nextSibling); else document.body.appendChild(ov);
  $('rmvToken').addEventListener('click', e => { if (typeof ptShow !== 'function') return; ptShow(e); const c = $('ptCard'); if (c) c.style.zIndex = '60'; });
  $('rmvAgain').addEventListener('click', () => { rmvHide(); zmAgain(); });
  $('rmvMenu').addEventListener('click', () => { rmvHide(); fpsStop(); });
  window.addEventListener('resize', () => { if (RMV.on) rmvLayout(); });
}
// (raidShowOver) won, at the very end: this screen instead of the card. True if it's up
function rmvShow() {
  if (!RAID.won || !(typeof raidInfo === 'function' && raidInfo().mvp && (RAID.map !== 'raid' || RAID_ORDER[RAID_ORDER.length - 1] === 'fort'))) return false;
  if (RMV.on) return true;   // (already up: zmTick asks again while the plain card stays hidden)
  rmvBuild();
  if (!RMV.snap) RMV.snap = rmvGather();
  RMV.held = true;
  $('zmOver').hidden = true;
  $('rmvOver').hidden = false; RMV.on = true;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  rmvRender();
  setTimeout(() => { const b = $('rmvAgain'); if (b) b.focus({ preventScroll: true }); }, 30);
  if (!RMV.raf) RMV.raf = requestAnimationFrame(rmvFrame);
  return true;
}
function rmvHide() {
  RMV.on = false;
  const ov = $('rmvOver'); if (ov) ov.hidden = true;
  rmv3dFree();
}
// the cards, and the figures to match
function rmvRender() {
  const L = RMV.snap || [];
  RMV.key = JSON.stringify(L);
  const P = RMV.P = rmvRank(L), me = FPS.me.id;
  const n = P.length, tok = typeof ptTokens === 'function' ? ptTokens() : 0;
  $('rmvSub').textContent = `${n > 1 ? n + ' of you, ' : ''}all three parts in ${typeof raidClock === 'function' ? raidClock(RAID.t) : Math.round(RAID.t) + ' s'}. ${P[0] ? (P[0].id === me ? 'You were the best of the night.' : P[0].n + ' was the best of the night.') : ''}`;
  $('rmvToken').textContent = tok > 0 ? `Spend your pirate token (${tok})` : 'The Gannet’s Locker';
  $('rmvAgain').textContent = ZM.net ? 'Play again (to the lobby)' : 'Play again';
  const box = $('rmvCards'); box.textContent = '';
  P.forEach((p, i) => {
    const C = p.cls && RCL_CLASSES[p.cls], d = document.createElement('div');
    d.className = 'rmvcard' + (i === 0 ? ' mvp' : '');
    d.innerHTML = (i === 0 ? '<span class="rmvtag">MVP</span>' : '') + '<span class="rmvname"></span><span class="rmvcls"></span>';
    d.querySelector('.rmvname').textContent = p.n + (p.id === me && n > 1 ? ' (you)' : '');
    const cl = d.querySelector('.rmvcls'); cl.textContent = C ? C.n : 'Keeper'; cl.style.color = C ? C.c : '#c8bfa6';
    for (const t of p.top) {
      const S = RMV_STATS.find(s => s[0] === t.k), row = document.createElement('div');
      row.className = 'rmvstat' + (t.lead ? ' lead' : '');
      const sp = document.createElement('span'); sp.textContent = S[1];
      const b = document.createElement('b'); b.textContent = S[2](t.v);
      row.append(sp, b); d.appendChild(row);
    }
    box.appendChild(d);
    p.card = d;
  });
  rmv3dBuild(P);
  rmvLayout();
}

// ---------- the figures, in a scene of their own ----------
function rmv3dFree() {
  const R = RMV.r3; if (!R) return;
  RMV.r3 = null;
  try { for (const F of R.figs) { F.root.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); }); for (const m of F.mats) m.dispose(); } } catch (e) {}
  try { R.r.dispose(); R.r.forceContextLoss && R.r.forceContextLoss(); } catch (e) {}
}
function rmv3dBuild(P) {
  rmv3dFree();
  if (typeof THREE === 'undefined' || typeof fbFigure !== 'function' || typeof GL3D === 'undefined') return;
  // (a fresh canvas each time: one whose context has been let go can't be drawn on again)
  const old = $('rmv3d'); if (!old) return;
  const cv = old.cloneNode(false); old.replaceWith(cv);
  let r;
  try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return; }
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffd0a0, 0x2a2030, 0.75));
  const sun = new THREE.DirectionalLight(0xffa060, 0.9); sun.position.set(-4, 5, 8); scene.add(sun);   // (behind them, the sun going down)
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.7); fill.position.set(2, 4, -9); scene.add(fill);
  const G = FPSC.GROUND;
  // the sea wall's top: worn flagstones, a parapet behind, and a gold step for the best of them
  const stone = new THREE.MeshLambertMaterial({ color: 0x6a5a4e, flatShading: true }), stone2 = new THREE.MeshLambertMaterial({ color: 0x5a4c42, flatShading: true });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 7), stone); floor.position.set(0, G - 0.2, 1); scene.add(floor);
  for (let i = -7; i <= 7; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.6), i % 2 ? stone : stone2); m.position.set(i * 2, G + 0.45, 4.2); scene.add(m); }
  const step = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.28, 24), new THREE.MeshLambertMaterial({ color: 0xc89a3a, emissive: 0x6a4a10, emissiveIntensity: 0.4 }));
  step.position.set(0, G + 0.14, -0.35); scene.add(step);
  // (fbFigure puts what it builds in the game's scene: borrowed here, and moved to this one)
  const figs = [], keep = GL3D.scene, tmp = new THREE.Scene();
  GL3D.scene = tmp;
  try {
    P.forEach((p, i) => {
      const x = RMV_X[i] || 0, y = i === 0 ? -0.35 : 0.25 + Math.floor((i - 1) / 2) * 0.35;
      const outfit = typeof ocOutfit === 'function' && ocOutfit(p.o) ? p.o : '';
      let F; try { F = fbFigure(Array.isArray(p.col) ? p.col : ['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'], outfit); } catch (e) { return; }
      tmp.remove(F.root); scene.add(F.root);
      const C = p.cls && RCL_CLASSES[p.cls];
      F.mv = { x, y, jz: i === 0 ? 0.28 : 0, h: x * 0.06, id: C ? C.w[0] : 'pepperbox', plain: p.id !== FPS.me.id, mvp: i === 0, ph: i * 1.7 };
      figs.push(F); p.fig = F;
    });
  } finally { GL3D.scene = keep; }
  RMV.r3 = { r, scene, cam, figs, t: 0 };
}
// the camera fitted to however many there are, and each card under its figure's feet
function rmvLayout() {
  const st = $('rmvStage'); if (!st) return;
  const W = st.clientWidth, H = st.clientHeight, P = RMV.P || [], n = P.length, phone = W < 640;
  const cw = Math.min(phone ? 150 : 200, Math.floor((W - 16) / Math.max(1, n)) - 6);
  for (const p of P) if (p.card) p.card.style.setProperty('--w', cw + 'px');
  const R = RMV.r3, G = FPSC.GROUND;
  const span = Math.max(1.6, (RMV_X[Math.max(0, n - 1)] ? Math.abs(RMV_X[n - 1]) : 0) + 1.2);
  if (R) {
    R.r.setSize(W, H, false);
    R.cam.aspect = W / Math.max(1, H);
    // far enough back that the whole row fits across (and the best of them stands tall in the middle)
    const half = Math.tan(R.cam.fov * Math.PI / 360), dist = Math.max(5.2, span / (half * R.cam.aspect) * 1.02, 1.9 / half);
    R.cam.position.set(0, G + 1.5, -dist); R.cam.lookAt(0, G + 0.85, 0); R.cam.updateProjectionMatrix(); R.cam.updateMatrixWorld(true);
  }
  // the cards: under each figure's feet (where the figures are), or in a plain row (where there are none)
  P.forEach((p, i) => {
    if (!p.card) return;
    let x = W / 2 + (n > 1 ? (RMV_X[i] / span) * (W / 2 - cw / 2 - 6) : 0), y = H * 0.66;
    if (R && p.fig) {
      const v = new THREE.Vector3(p.fig.mv.x, G - 0.1, -p.fig.mv.y).project(R.cam);
      x = (v.x * 0.5 + 0.5) * W; y = (-v.y * 0.5 + 0.5) * H + 4;
    }
    p.cx = x; p.cy = y;
  });
  // (too close together to fit, as on a phone: the cards spread evenly across, in the figures' order)
  const Q = P.filter(p => p.card).sort((a, b) => a.cx - b.cx), tight = Q.some((p, i) => i && p.cx - Q[i - 1].cx < cw + 6);
  Q.forEach((p, i) => {
    const x = tight ? W / 2 + (i - (Q.length - 1) / 2) * (cw + 6) : clamp(p.cx, cw / 2 + 4, W - cw / 2 - 4);
    p.card.style.left = x + 'px'; p.card.style.top = Math.min(p.cy, H - p.card.offsetHeight - 4) + 'px';
  });
}
function rmvFrame(now) {
  RMV.raf = 0;
  if (!RMV.on) return;
  // the raid's over and gone (left, or a new one): the screen too
  if (!ZM.on || !ZM.over) { rmvHide(); return; }
  const R = RMV.r3;
  if (R) {
    const dt = Math.min(0.05, ((now - (R.last || now)) / 1000) || 0.016), t = now / 1000; R.last = now;
    for (const F of R.figs) {
      const v = F.mv;
      try {
        fbPose(F, { dt, x: v.x, y: v.y, jz: v.jz, vz: 0, h: v.h + (reduceMotion ? 0 : Math.sin(t * 0.5 + v.ph) * 0.04), p: v.mvp ? -0.25 : 0.05 + Math.sin(t * 0.7 + v.ph) * 0.03, spd: 0, ph: 0, cr: 0, id: v.id, plain: v.plain, pap: 0,
          rec: 0, draw: 0, rl: 0, slash: -1, lan: true, t, see: 1, op: 1 });
        // (a breath, and the best of them with the gun shouldered up high)
        F.root.position.y += reduceMotion ? 0 : Math.sin(t * 1.6 + v.ph) * 0.006;
      } catch (e) {}
    }
    try { R.r.render(R.scene, R.cam); } catch (e) {}
  }
  RMV.raf = requestAnimationFrame(rmvFrame);
}
