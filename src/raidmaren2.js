'use strict';
// Maren's End, Part III: Maren's second phase. At a third of her health she stops and calls up the storm (she rises
// off the floor with her arms up, can't be hurt, and the sky closes over); then the fight goes on in the dark, and
// she shrugs off a quarter of every hit and strikes faster.
//  - The Lantern Goes Out: every lamp in the fort dies. Each of you carries a small lantern; you see her only by her
//    eyes, and by the lightning, which flashes every second or two and shows the whole fort for a moment.
//  - The Bell Toll: a drowned bell tolls three times, a few seconds apart, and big sea-green circles glow on the floor
//    of the Plaza and the Battery. At the third toll the sea drags under everyone who isn't standing in one (half
//    your health); then the circles fade and others glow somewhere else.
// The host runs her and the bell; every screen draws the storm, its own lightning, and judges only its own player.
// Here for src/raidmusic.js, on every screen: RF.p2 (her second phase begun), RF.p2i (her storm call playing),
// RF.tide (0 to 1: up to 1 at each toll and each flash, dying away over a second), RF.bolt (one more each flash).
// Hooks into src/raidfort.js (each one line marked [p2]) and src/fpsisle.js (the lamps' lights, rfLampsK).

const RF2 = {
  AT: 1 / 3,   // (her health left when it begins)
  LIFT: 1.6,   // (how high she rises off the floor for it)
  RESIST: 0.75, SP: 1.3, CD: 0.7,   // (what a hit does to her now; her speed; her wind-ups' cooldowns)
  STORM_IN: 3.8, STORM_OUT: 3,   // (seconds for the sky to close over, and to clear when she's dead)
  LT: [0.8, 2.4], LT_CALL: [0.25, 0.7],   // (seconds between flashes: in the fight, and while she calls the storm)
  LAMP: 13,   // (how far your lantern lights)
  FEWER: 0.8,   // (how many of the drowned at once in her storm, against before it)
  BELL: { R: 7.8, N: 3, FIRST: 2.5, GAP: 2.2, TOLL: 3.6, HOLD: 0.9, SEP: 2, SLOW: 0.6 },   // (circle radius, how many, before the
  // first, between rounds, between tolls, how long the circles stay after the third, the least gap between circles,
  // how fast the drowned go inside one)
};
const RF2_STORM = { amb: 0.035, moon: 0, fog: [0.006, 0.008, 0.012], near: 2, far: 32 };

// everyone's part of the state, laid fresh with the fort's (rfEnter)
function rf2Reset() {
  Object.assign(RF, { practice: typeof RAID !== 'undefined' && RAID.practice ? 1 : 0, p2: 0, p2i: 0, storm: 0, tide: 0, bolt: 0, lt: 0, lt2: 0, ltT: 1, bell: { ph: 0, t: 0, n: 0, c: [], seq: 0 }, bs: { seq: -1, n: 0 }, p2Seen: 0, fog0: null, under: 0 });
}

// ---------- the host ----------
// each frame of her fight: at a third of her health, the storm call; then the bell
function rf2Host(M, dt) {
  if (!M || M.dead) return;
  if (!RF.p2 && M.act !== 'rise' && M.hp <= M.max * RF2.AT) {
    RF.p2 = 1; M.sp *= RF2.SP; M.wj0 = M.fl || 0;
    zbStart(M, 'wrath');
    // (the sea takes back a fifth of the drowned as the storm comes: the farthest from any of you)
    { const P = (ZM.players || []).filter(p => p && p.x != null), far = z => Math.min(...P.map(p => Math.hypot(z.x - p.x, z.y - p.y)), 1e9);
      const live = ZM.z.filter(z => !z.dead && !z.boss).sort((a, b) => far(b) - far(a)), cap = Math.round((RFC.ALIVE[1] + RFC.ALIVE_MORE * (rfN() - 1)) * RF2.FEWER);
      for (let i = 0; i < live.length - cap; i++) zmKill(live[i], false, '', 'flash'); }
    RF.bell = { ph: 0, t: -RF2.BELL.FIRST, n: 0, c: [], seq: (RF.bell.seq || 0) + 1 };
  }
  if (!RF.p2 || M.act === 'wrath') return;
  const B = RF.bell, C = RF2.BELL; B.t += dt;
  // (the bell waits for a ring she's calling to erupt: never the two at once)
  if (B.ph === 0) { if (B.t >= C.GAP && M.act !== 'call') { B.ph = 1; B.t = 0; B.n = 0; B.c = rf2Spots(); B.seq++; } }
  else {
    B.n = Math.max(B.n, Math.min(3, Math.floor(B.t / C.TOLL)));
    if (B.t >= C.TOLL * 3 + C.HOLD) { B.ph = 0; B.t = 0; B.n = 0; }
  }
}
// where the circles glow: flat floor in the Plaza or on the Battery (all of the circle on the one level), apart from
// each other; the first near one of you, so there's always one in reach
function rf2Spots() {
  const C = RF2.BELL, B = RFC.BOX, out = [], CX = FPSC.CX, CY = FPSC.CY;
  const live = (ZM.players || []).filter(p => p && !(p.dead > 0) && p.x != null);
  const near = live.length ? live[(Math.random() * live.length) | 0] : FPS.me;
  const flat = (x, y) => {
    const h0 = zmFloorAt(CX + x, CY + y, 12, 0.3);
    if (Math.abs(h0) > 0.15 && Math.abs(h0 - RFC.RT) > 0.15) return false;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; if (Math.abs(zmFloorAt(CX + x + Math.cos(a) * C.R * 0.85, CY + y + Math.sin(a) * C.R * 0.85, 12, 0.3) - h0) > 0.2) return false; }
    return true;
  };
  for (let tries = 0; tries < 400 && out.length < C.N; tries++) {
    const x = B[0] + C.R + Math.random() * (B[1] - B[0] - C.R * 2), y = B[2] + C.R * 0.6 + Math.random() * (B[3] - B[2] - C.R * 1.6);   // (clear of the side walls and the rooms past them)
    if (!out.length && near && tries < 250 && Math.hypot(CX + x - near.x, CY + y - near.y) > 20) continue;
    if (out.some(c => Math.hypot(c[0] - x, c[1] - y) < C.R * 2 + C.SEP)) continue;
    if (!flat(x, y)) continue;
    out.push([x, y]);
  }
  return out;
}

// ---------- every screen ----------
function rf2Me(dt) {
  const M = ZM.z.find(z => z.zn === RF.mz && !z.dead), m = FPS.me;
  RF.p2i = RF.p2 && M && M.act === 'wrath' ? 1 : 0;
  // her storm call begins: told here
  if (RF.p2 && !RF.p2Seen) {
    RF.p2Seen = 1;
    ZM.banner = { text: 'Maren’s Wrath', t: 4.2, col: '#8fd8ff', sub: 'the storm comes, and the lights go out' };
    fpsFeed('Maren calls up the storm. Every light in the fort goes out.');
  }
  // the sky closing over, or clearing when she's gone
  const want = RF.p2 && RF.st === 'maren' ? 1 : 0;
  RF.storm = want ? Math.min(1, RF.storm + dt / RF2.STORM_IN) : Math.max(0, RF.storm - dt / RF2.STORM_OUT);
  // the lightning: my own (a flash, then a flicker after it)
  RF.lt = Math.max(0, RF.lt - dt * 4.5); RF.tide = Math.max(0, RF.tide - dt);
  if (RF.lt2 > 0) { RF.lt2 -= dt; if (RF.lt2 <= 0) RF.lt = Math.max(RF.lt, 0.75); }
  if (RF.storm > 0.25 && want) {
    RF.ltT -= dt;
    if (RF.ltT <= 0) {
      const L = RF.p2i ? RF2.LT_CALL : RF2.LT;
      RF.ltT = L[0] + Math.random() * (L[1] - L[0]);
      RF.lt = 1; RF.lt2 = Math.random() < 0.6 ? 0.09 + Math.random() * 0.08 : 0; RF.bolt++; RF.tide = 1;
      RF.boltA = Math.random() * 6.283; RF.boltK = 1;
    }
  }
  if (RF.boltK > 0) RF.boltK = Math.max(0, RF.boltK - dt * 4);
  // the bell: each toll heard; at the third, am I in a circle?
  const B = RF.bell;
  if (ZM.net === 'client' && B.ph === 1) B.t += dt;
  if (B.seq !== RF.bs.seq) RF.bs = { seq: B.seq, n: 0 };
  if (B.ph === 1 && B.n > RF.bs.n && RF.st === 'maren') {
    RF.bs.n = B.n; RF.tide = 1; rf2Toll(B.n);
    if (B.n >= 3) rf2Judge();
  }
  if (RF.under > 0) RF.under = Math.max(0, RF.under - dt);
}
// am I (or anyone at x, y, standing at jz) in one of the circles?
function rf2In(x, y, jz) {
  const C = RF2.BELL;
  return (RF.bell.c || []).some(([cx, cy]) => { const wx = FPSC.CX + cx, wy = FPSC.CY + cy; return Math.hypot(x - wx, y - wy) < C.R && Math.abs((jz || 0) - zmFloorAt(wx, wy, 12, 0.3)) < 1.6; });
}
// the third toll: outside every circle, the sea drags you under
function rf2Judge() {
  const m = FPS.me;
  for (const [cx, cy] of RF.bell.c || []) { const x = FPSC.CX + cx, y = FPSC.CY + cy, iz = zmFloorAt(x, y, 12, 0.3); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; fpsPuff(x + Math.cos(a) * RF2.BELL.R, y + Math.sin(a) * RF2.BELL.R, FPSC.GROUND + iz + 0.3 + Math.random(), '120,255,215', 3); } }
  if (!zbOk() || zmIsDown() || rf2In(m.x, m.y, m.jz)) return;
  fpsHurt(rfHalf(), null, null); zmSound('hit'); FPS.hurtT = 1; RF.under = 1.2;
  FPS.eyeLag = clamp((FPS.eyeLag || 0) + 0.5, -0.8, 0.8);
  for (let i = 0; i < 24; i++) { const a = Math.random() * 6.283, r = Math.random() * 1.6; fpsPuff(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, FPSC.GROUND + (m.jz || 0) + Math.random() * 2, '120,200,190', 3); }
  try { if (typeof sfxSplash === 'function') sfxSplash(0, 1); } catch (e) {}
  fpsFeed('The bell tolls the third time, and the sea drags you under.');
}
// the drowned bell: low and slow, from under the water; the third toll the loudest
function rf2Toll(n) {
  try {
    if (typeof tone !== 'function' || !AUD.ctx) return;
    const k = n >= 3 ? 1 : 0.7;
    for (const [f, a, d] of [[98, 0.55, 5.5], [196, 0.32, 4.4], [293, 0.2, 3.4], [415, 0.12, 2.6], [49, 0.4, 6.5]]) tone(f, 'sine', 0.006, a * k, d);
    tone(147, 'triangle', 0.02, 0.12 * k, 3.2, { to: 140 });
  } catch (e) {}
}

// ---------- on top ----------
// the lines top left and the circles' marks; under the water, a green wash
function rf2Hud(phone, mono, fell, line, top) {
  const t = g.t, m = FPS.me, B = RF.bell, C = RF2.BELL;
  if (RF.p2i) { line('Maren calls up the storm', top, `rgba(140,215,255,${0.8 + 0.2 * Math.sin(t * 8)})`, fell(phone ? 15 : 20)); return top + (phone ? 20 : 26); }
  if (!RF.p2) return top;
  let y = top;
  if (B.ph === 1 && (B.c || []).length) {
    const safe = rf2In(m.x, m.y, m.jz), left = Math.max(0, C.TOLL * 3 - B.t);
    if (B.n < 3) {
      line(`The bell tolls: ${B.n} of 3`, y, `rgba(130,255,215,${0.8 + 0.2 * Math.sin(t * 6)})`, fell(phone ? 15 : 20)); y += phone ? 20 : 26;
      line(safe ? 'Safe in the circle: stay there' : `Get into a sea-green circle! ${left.toFixed(1)} s`, y, safe ? 'rgba(160,255,220,0.9)' : `rgba(255,150,140,${0.75 + 0.25 * Math.sin(t * 10)})`); y += phone ? 14 : 17;
    }
    // each circle's mark: a sea-green ring over it, and how far, wherever it is in front of you
    if (B.n < 3) for (const [cx, cy] of B.c) {
      const x0 = FPSC.CX + cx, y0 = FPSC.CY + cy, c = cam(x0, y0, FPSC.GROUND + zmFloorAt(x0, y0, 12, 0.3) + 1.2);
      if (c.f < 0.4) continue;
      const q = proj(c), x = clamp(q.x, 30, W - 30), yy = clamp(q.y, 40, H - 40), a = 0.7 + 0.3 * Math.sin(t * 6);
      ctx.strokeStyle = `rgba(120,255,215,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, yy, 9, 0, 6.283); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 10 : 11); ctx.fillStyle = `rgba(150,255,225,${a})`;
      ctx.fillText(`${Math.round(Math.hypot(x0 - m.x, y0 - m.y))} m`, x, yy - 12);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }
  if (RF.under > 0) { ctx.fillStyle = `rgba(20,90,80,${0.5 * Math.min(1, RF.under)})`; ctx.fillRect(0, 0, W, H); }
  return y;
}

// ---------- in 3D ----------
const RF3B = {};
// a soft cloud sheet, drawn once: dark puffs on a clear ground, tiling
function rf2CloudTex() {
  if (RF3B.tex) return RF3B.tex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) {
    const px = rnd() * 256, py = rnd() * 256, r = 18 + rnd() * 46, a = 0.18 + rnd() * 0.3;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      const gr = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
    }
  }
  const T = RF3B.tex = new THREE.CanvasTexture(c); T.wrapS = T.wrapT = THREE.RepeatWrapping; return T;
}
function rf2Build3d(grp) {
  RF3B.dome = null;
  // the storm's sky: a dark dome over everything (it hides the moon and the stars), two sheets of cloud racing under
  // it, and the lightning's bolt
  const dome = RF3B.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0a0d12, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  dome.renderOrder = -5; dome.visible = false; dome.frustumCulled = false; grp.add(dome);
  RF3B.clouds = [];
  for (const [h, rep, op] of [[150, 3, 0.95], [95, 5, 0.75]]) {
    const T = rf2CloudTex().clone(); T.needsUpdate = true; T.repeat.set(rep, rep);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshBasicMaterial({ map: T, color: 0x1a1f28, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    p.rotation.x = Math.PI / 2; p.renderOrder = -4; p.visible = false; p.frustumCulled = false; p.h = h; p.op = op; grp.add(p); RF3B.clouds.push(p);
  }
  const bolt = RF3B.bolt = new THREE.Group(); bolt.visible = false; grp.add(bolt);
  RF3B.boltM = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 1, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  // the circles of the bell: a bright rim, a glowing floor, a curtain of light standing up off the rim, a ring of
  // marks turning round inside it
  RF3B.circ = [];
  const fade = z3Fade([[0, 'rgba(120,255,215,0.7)'], [0.5, 'rgba(100,240,200,0.2)'], [1, 'rgba(80,220,190,0)']]);
  for (let i = 0; i < RF2.BELL.N; i++) {
    const r = new THREE.Group(); r.visible = false; grp.add(r);
    const add = (geo, op, map, flat) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x80ffe0, map: map || null, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); if (flat) m.rotation.x = -Math.PI / 2; r.add(m); return m; };
    r.rim = add(new THREE.RingGeometry(0.9, 1, 64), 0.95, null, true);
    r.rim2 = add(new THREE.RingGeometry(0.78, 0.8, 64), 0.6, null, true);
    r.disc = add(new THREE.CircleGeometry(1, 48), 0.22, null, true);
    const wg = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true); wg.translate(0, 0.5, 0);
    r.wall = add(wg, 0.8, fade, false);
    r.marks = new THREE.Group(); r.add(r.marks);
    for (let j = 0; j < 12; j++) { const mk = add(new THREE.PlaneGeometry(0.07, 0.2), 0.8, null, true); r.remove(mk); const a = j / 12 * 6.283; mk.position.set(Math.cos(a) * 0.68, 0, Math.sin(a) * 0.68); mk.rotation.z = -a; r.marks.add(mk); }
    RF3B.circ.push(r);
  }
  // her eyes in the dark: two pale points, glowing
  RF3B.eyes = [0, 1].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(220,255,245,1)', 'rgba(140,255,220,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.visible = false; grp.add(s); return s; });
}
// a new bolt: a jagged stroke from the clouds down to the sea, somewhere off over the water
function rf2Bolt() {
  const B = RF3B.bolt; while (B.children.length) { const c = B.children.pop(); c.geometry.dispose(); }
  const a = Math.PI + (Math.random() - 0.5) * 2.4, d = 160 + Math.random() * 160, x0 = FPSC.CX + Math.sin(a) * d, y0 = FPSC.CY + Math.cos(a) * d;
  let p = z3v(x0 + (Math.random() - 0.5) * 30, y0 + (Math.random() - 0.5) * 30, FPSC.GROUND + 140);
  const end = FPSC.GROUND, n = 11, up = new THREE.Vector3(0, 1, 0);
  const seg = (a3, b3, w) => { const dv = b3.clone().sub(a3), len = dv.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w, len, 4, 1, true), RF3B.boltM); m.position.copy(a3).addScaledVector(dv, 0.5); m.quaternion.setFromUnitVectors(up, dv.normalize()); B.add(m); };
  for (let i = 1; i <= n; i++) {
    const q = new THREE.Vector3(p.x + (Math.random() - 0.5) * 22, (FPSC.GROUND + 140) + (end - FPSC.GROUND - 140) * i / n, p.z + (Math.random() - 0.5) * 22);
    seg(p, q, 0.9);
    if (Math.random() < 0.3) { const f = q.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, -10 - Math.random() * 12, (Math.random() - 0.5) * 30)); seg(q, f, 0.5); }
    p = q;
  }
}
function rf2Frame3d(dt) {
  if (!RF3B.dome) return;
  const t = g.t, S = RF.storm, L = Math.min(1, RF.lt), m = FPS.me, G0 = FPSC.GROUND, cam3 = GL3D.camera.position;
  // the dark, and the lightning's flash over it
  if (S > 0.001 || RF.fog0) {
    const F = GL3D.scene.fog;
    if (F && !RF.fog0) RF.fog0 = { c: F.color.clone(), near: F.near, far: F.far };
    const D = S, base = RF.fog0;
    GL3D.amb.intensity = 0.42 + (RF2_STORM.amb - 0.42) * D + L * 1.1 * D;
    GL3D.moon.intensity = 0.12 * (1 - D) + L * 0.5 * D;
    if (F && base) {
      F.color.setRGB(base.c.r + (RF2_STORM.fog[0] - base.c.r) * D + L * 0.25 * D, base.c.g + (RF2_STORM.fog[1] - base.c.g) * D + L * 0.27 * D, base.c.b + (RF2_STORM.fog[2] - base.c.b) * D + L * 0.32 * D);
      F.near = base.near + (RF2_STORM.near - base.near) * D; F.far = base.far + (RF2_STORM.far - base.far) * D + L * 160 * D;
    }
    if (S <= 0.001 && base && F) { F.color.copy(base.c); F.near = base.near; F.far = base.far; RF.fog0 = null; }
  }
  // the sky
  const sky = S > 0.001;
  RF3B.dome.visible = sky; RF3B.dome.position.copy(cam3);
  RF3B.dome.material.opacity = 0.96 * S; RF3B.dome.material.color.setRGB(0.04 + L * 0.5, 0.05 + L * 0.52, 0.07 + L * 0.6);
  RF3B.clouds.forEach((p, i) => {
    p.visible = sky; p.position.set(cam3.x, G0 + p.h, cam3.z);
    if (!reduceMotion) { p.material.map.offset.x = (t * (i ? 0.011 : 0.006) + cam3.x / 1800 * p.material.map.repeat.x) % 1; p.material.map.offset.y = (t * (i ? 0.004 : 0.0025) - cam3.z / 1800 * p.material.map.repeat.y) % 1; }
    p.material.opacity = p.op * S; const c = 0.1 + L * 0.85; p.material.color.setRGB(c, c * 1.04, c * 1.12);
  });
  // the bolt
  if (RF.boltK >= 0.999 && RF.lastBolt !== RF.bolt) { RF.lastBolt = RF.bolt; rf2Bolt(); }
  RF3B.bolt.visible = sky && RF.boltK > 0.05; RF3B.boltM.opacity = RF.boltK;
  // your lantern (and the others'), while it's dark
  if (typeof R3 !== 'undefined' && R3.light) {
    if (S > 0.01) {
      const show = !(m.dead > 0) && !zmIsDown() && !fpsThird() && !zmSpecOn(), fl = reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 4.7);
      R3.lan.visible = show && S > 0.3;
      R3.light.intensity = Math.max(R3.light.intensity, (show ? 1.7 : 0.8) * fl * S); R3.light.distance = RF2.LAMP;
      const list = [...FPS.remote.values()].filter(r => !r.dead && r.x != null);
      while (R3.theirs.length < list.length) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: R3.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(1.1); R3.grp.add(s); R3.theirs.push(s); }
      R3.theirs.forEach((s, i) => { const r = list[i]; s.visible = !!r && S > 0.3; if (r) s.position.copy(z3v(r.x + Math.cos(r.h || 0) * -0.35, r.y + Math.sin(r.h || 0) * 0.35, G0 + (r.jz || 0) + 1.0)); });
    }
  }
  // her eyes
  const M = ZM.z.find(z => z.zn === RF.mz && !z.dead), E = M && M.mdl;
  RF3B.eyes.forEach((s, i) => {
    s.visible = !!E && S > 0.05;
    if (!s.visible) return;
    const hp = new THREE.Vector3(); E.head.getWorldPosition(hp);
    const h = M.h, side = i ? 1 : -1, sc = RFC.S;
    s.position.set(hp.x + Math.sin(h) * 0.12 * sc + Math.cos(h) * side * 0.055 * sc, hp.y + 0.01 * sc, hp.z - Math.cos(h) * 0.12 * sc + Math.sin(h) * side * 0.055 * sc);
    const vul = RF.vul > 0, p = 0.85 + 0.15 * Math.sin(t * 5 + i);
    s.material.color.setRGB(vul ? 1 : 0.85, vul ? 0.45 : 1, vul ? 0.45 : 0.95); s.material.opacity = S * p; s.scale.setScalar(0.13 * sc * p);
  });
  // the circles
  const B = RF.bell, C = RF2.BELL, on = RF.p2 && B.ph === 1 && RF.st === 'maren';
  RF3B.circ.forEach((r, i) => {
    const c = on && B.c && B.c[i]; r.visible = !!c;
    if (!c) return;
    const x = FPSC.CX + c[0], y = FPSC.CY + c[1], iz = zmFloorAt(x, y, 12, 0.3);
    const k = B.n >= 3 ? Math.max(0, 1 - (B.t - C.TOLL * 3) / C.HOLD) : Math.min(1, B.t / 0.5), pulse = 0.5 + 0.5 * Math.sin(t * (4 + B.n * 3));
    const flash = B.n >= 3 ? 1 : 0;
    r.position.copy(z3v(x, y, G0 + iz + 0.05)); r.scale.set(C.R, 1, C.R);
    r.rim.material.opacity = (0.75 + 0.25 * pulse) * k; r.rim2.material.opacity = (0.4 + 0.3 * pulse) * k;
    r.disc.material.opacity = (0.16 + 0.1 * pulse + flash * 0.4) * k;
    r.wall.scale.y = 2.6 + 0.6 * pulse + flash * 3; r.wall.material.opacity = (0.45 + 0.25 * pulse) * k;
    r.marks.rotation.y = reduceMotion ? 0 : t * 0.6 * (i % 2 ? -1 : 1);
    for (const mk of r.marks.children) mk.material.opacity = 0.7 * k;
  });
}
// (src/zombies.js, src/zmboss.js) the drowned wade slowly through the bell's circles (all but Maren herself)
function rf2SlowK(z) {
  if (typeof RF === 'undefined' || !RF.on || !RF.p2 || !RF.bell || RF.bell.ph !== 1 || z.bt === 'maren') return 1;
  return rf2In(z.x, z.y, z.jz) ? RF2.BELL.SLOW : 1;
}
// (src/fpsisle.js) the fort's lamps, dying as the storm comes
function rfLampsK() { return typeof RF !== 'undefined' && RF.on && RF.storm > 0 ? 1 - 0.98 * RF.storm : 1; }
// (src/raidfort.js rfPack / rfApply) her second phase on the wire: begun; the bell's round, tolls, time (tenths)
// and number; its circles (how many, then each one's place, tenths, from the island's middle)
function rf2Pack() {
  const B = RF.bell || { c: [] }, c = B.c || [];
  return [RF.p2 ? 1 : 0, B.ph | 0, B.n | 0, Math.round(Math.max(0, B.t) * 10), B.seq | 0, c.length].concat(...c.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]));
}
function rf2Apply(f, i) {
  RF.p2 = f[i] ? 1 : 0;
  const B = RF.bell, n = f[i + 5] | 0;
  B.ph = f[i + 1] | 0; B.n = f[i + 2] | 0; B.t = f[i + 3] / 10; B.seq = f[i + 4] | 0;
  B.c = []; for (let k = 0; k < n; k++) B.c.push([f[i + 6 + k * 2] / 10, f[i + 7 + k * 2] / 10]);
}

// ---------- practice ----------
// The hidden "Practise: Maren's storm": alone, straight to the fort and Maren, already down to a third, so her
// storm begins as soon as she's up. No pirate token, no score, no raid won.
function rf2Practice() {
  if (typeof ZN !== 'undefined' && ZN.code) return;
  zmStart({ map: 'raid' });
  RAID.practice = 1; RAID.told = true;
  const go = (n) => { if (!RAID.on || !FPS.g) { if (n < 40) setTimeout(() => go(n + 1), 100); return; } raidUseStage(RAID_ORDER.indexOf('fort')); RF.practice = 1; };
  setTimeout(() => go(0), 150);
}
// (alone, each frame) once your calling's chosen: Maren comes; once she's up, a third of her health is gone
function rf2PracticeTick() {
  if (RF.practice === 1 && RF.st === 'hunt' && !FPS.menu) {
    RF.practice = 2;
    for (const k of RF_APO_IDS) RF.apo[k] = 2;
    ZM.banner = { text: 'Practice: Maren\u2019s storm', t: 3.5, col: '#8fd8ff', sub: 'no token, no score', small: true };
    rfMaren();
  }
  if (RF.practice === 2 && RF.st === 'maren') {
    const M = ZM.z.find(z => z.zn === RF.mz && !z.dead);
    if (M && M.act !== 'rise') { M.hp = Math.min(M.hp, M.max * RF2.AT * 0.99); RF.practice = 3; }
  }
}
// Tucked away in Settings rather than on the raid card: five quick taps on the "Kept on this device" line, from the
// title screen only, show the button; closeSettings hides it again.
try {
  const b = document.getElementById('rdPractice'), row = document.getElementById('rdPracticeRow'), eb = document.querySelector('#settingsCard .eyebrow');
  let taps = 0, last = 0;
  if (eb && row) eb.addEventListener('click', () => {
    const now = performance.now(); taps = now - last < 1500 ? taps + 1 : 1; last = now;
    if (taps >= 5 && !document.getElementById('titleCard').hidden) { row.hidden = false; taps = 0; }
  });
  if (b) b.addEventListener('click', () => { if (row) row.hidden = true; document.getElementById('settingsCard').hidden = true; rf2Practice(); });
} catch (e) {}
