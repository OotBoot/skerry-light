// Fog Run: more of the Unknown islands' encounters (FRI_UNKNOWN, src/frisle.js), each a friLit rule like the first four.
// Kept in a file of their own, loaded after src/frisle.js; FR_KINDS.unknown.rules is brought up to date at the foot so
// the chart draws them as it draws the rest. You only learn which it is as you land:
//  - castaway: a living man by a driftwood fire across the island. Speak to him and the drowned come for him: keep them
//    off him for FRX.CAST seconds (let them crowd him FRX.DOUSE seconds' worth and he's taken). Saved, he mends every
//    one of you, stows a spare plank aboard (FR.crew.planks, src/frcards.js) and leaves a rare card (friRare). No
//    lighting the beacon and leaving while you're keeping him.
//  - dice: a drowned sailor at an upturned barrel, dicing. Each of you can throw once: seven or more and he pays out what
//    a wreck's chest would (friGift); a double six, that and the Lampwright's Spark; under seven and he takes FRX.LOSE
//    points and a knock off you.
//  - casks: the keeper's oil, FRX.CASKS casks of it washed up and scattered across the island. Broach each (hold Use,
//    anyone) and the fog draws back FRX.PUSH m for the rest of the reach (frFogPush); all of them, a rare card.
//  - gold: the wreckers' gold heaped round an old figurehead. Each of you can take a share once (FRX.GOLD points a reach),
//    but every share taken wakes a rush of the drowned, and the beacon won't take until FRX.CURSE seconds after the last.
//  - bargain: a standing stone that talks in the fog. Pay it everything you carry (all your points, FRX.PRICE at the
//    least) and it gives you a relic you haven't got (frcAddRelic), each of you once.
//  - bottle: a bottle in the wrack with an old chart in it. Each of you who reads it keeps FRX.FRAGS chart fragments for
//    good (src/frkeep.js); the first to read it finds a shorter way, a fair wind for the next sail (FR.crew.fair: the
//    leg is shorter, the cutter no slower).
// Together it's host-authoritative where it's shared (the castaway, the casks, the gold's rush and curse, the fair wind:
// raidAsk 'xcast', 'xcask', 'xgold', 'xbottle'; the stage's word fx); the dice, the stone and the bottle's fragments
// are each your own.
const FRX = { CAST: 40, DOUSE: 3.5, DOUSE_R: 2.3, LOSE: 300, CASKS: 4, PUSH: 8, BROACH: 1.5, GOLD: 500, CURSE: 20, PRICE: 500, FRAGS: 2 };
const FRX3 = { on: false };
const friDone3 = () => { FRX3.on = false; };
// a soft sprite (a glint, a fire, a halo) at (x, y), h m up
function frxGlow(grp, x, y, h, inner, outer, s) {
  const Z = FPSC.GROUND + fpsIsleH(FPS.g.isle, x, y), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(inner, outer), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.position.copy(z3v(x, y, Z + h)); sp.scale.setScalar(s); grp.add(sp); return sp;
}
const frxAt = (x, y) => z3v(x, y, FPSC.GROUND + fpsIsleH(FPS.g.isle, x, y));
const frxCasks = () => { const F = FPS.g.isle.zm.fr; return F && F.casks ? F.casks.map(c => [FPSC.CX + c[0], FPSC.CY + c[1]]) : []; };

Object.assign(FRI_UNKNOWN, {
  castaway: friLit({
    n: 'The Castaway', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { cw: 0, cwT: FRX.CAST, cwD: 0, cwH: 0 }); fpsFeed('Smoke across the island: a driftwood fire, and a man by it. A living one.'); },
    tick(dt) {
      const S = RAID.st; if (S.cw !== 1) return;
      const n = friN(), [x, y] = friFar(); S.cwT -= dt; friTrickle(dt, 4 + 2 * n, 2.4);
      let k = 0; for (const z of ZM.z) if (!z.dead && !(z.rr > 0) && Math.hypot(z.x - x, z.y - y) < FRX.DOUSE_R) k++;
      S.cwD = k ? S.cwD + dt * k : Math.max(0, S.cwD - dt * 0.6);
      if (S.cwD >= FRX.DOUSE) { S.cw = 3; frIsleSay('They’ve dragged him down into the fog. He’s gone.', true); }
      else if (S.cwT <= 0) { S.cw = 2; friRare(); if (FR.crew) FR.crew.planks++; frIsleSay('The drowned fall back from him. He mends you, stows a spare plank aboard, and leaves you a rare card.', true); }
    },
    q(sid, k) { const S = RAID.st; if (k === 'xcast' && !S.cw) { S.cw = 1; S.cwT = FRX.CAST; S.cwD = 0; frIsleSay(`“They’ve been coming for me every night,” he says. Keep them off him: ${FRX.CAST} seconds.`, true); } },
    players(P) { if (RAID.st.cw !== 1) return P; const [x, y] = friFar(); return P.concat([{ sid: '', x, y, jz: 0, beacon: true }]); },
    me() { const S = RAID.st, m = FPS.me; if (S.cw === 2 && !S.cwH && friAble()) { S.cwH = 1; m.hp = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP; try { zmSound('drink'); } catch (e) {} } },
    consider(c) { if (!RAID.st.cw) { const [x, y] = friFar(); c({ k: 'frcast' }, x, y, 0, 2.6, false); } },
    prompt(o) { return o.k === 'frcast' ? { text: 'Speak to the castaway' } : null; },
    use(o) { if (o.k !== 'frcast') return false; raidAsk('xcast'); return true; },
    readyLine() { const S = RAID.st; return S.cw === 1 ? `Keep the drowned off the castaway · ${Math.max(0, Math.ceil(S.cwT))} s` : S.cw ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Speak to the man by the fire, or light the beacon (hold Use at it) and go'; },
    hud(phone) {
      const S = RAID.st; if (S.cw !== 1) return;
      const w = phone ? 150 : 214, x = cx - w / 2, y = H * 0.2, k = clamp(S.cwD / FRX.DOUSE, 0, 1);
      ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 3, y - 3, w + 6, 12); ctx.fillStyle = k > 0.6 ? '#e06a50' : '#e8c890'; ctx.fillRect(x, y, w * (1 - k), 6);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = (phone ? '9px' : '11px') + ' monospace'; ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText('THE CASTAWAY', cx, y + 10); ctx.textBaseline = 'alphabetic';
    },
    pack(o) { const S = RAID.st; o.fx = [S.cw | 0, Math.round(S.cwT), Math.round(S.cwD * 10)]; },
    apply(o) { const S = RAID.st; if (Array.isArray(o.fx)) { S.cw = o.fx[0] | 0; S.cwT = o.fx[1] | 0; S.cwD = (o.fx[2] | 0) / 10; } },
    b3(grp) {
      const [x, y] = friFar(), [lx, ly] = friLand(), a = Math.atan2(ly - y, lx - x);
      FRX3.who = friFigure(grp, x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, -a + Math.PI / 2, 0x5a4a38, 0xc09a7a);
      FRX3.fire = frxGlow(grp, x, y, 0.4, 'rgba(255,200,130,0.95)', 'rgba(255,140,60,0)', 1.4);
      FRX3.light = new THREE.PointLight(0xff9a50, 1.6, 14, 1.4); FRX3.light.position.copy(z3v(x, y, FPSC.GROUND + fpsIsleH(FPS.g.isle, x, y) + 1)); grp.add(FRX3.light);
      const wood = new THREE.MeshLambertMaterial({ color: 0x3a2c20 });
      for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), wood); l.position.copy(frxAt(x, y)); l.position.y += 0.1; l.rotation.set(Math.PI / 2, 0, i * 0.8); grp.add(l); }
      FRX3.on = true; FRX3.rule = 'castaway';
    },
    f3() {
      if (!FRX3.on || FRX3.rule !== 'castaway') return; const S = RAID.st, fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(g.t * 13) * Math.sin(g.t * 4.1);
      FRX3.who.visible = S.cw !== 3; FRX3.fire.scale.set(1.3 * fl, 1.7 * (2 - fl), 1); FRX3.light.intensity = 1.6 * fl;
    },
    exit: friDone3,
  }),
  dice: friLit({
    n: 'The Dicing Man', ready0: true,
    set(H) { friUnknownSet(H); const F = H.I.zm.fr; if (!F || !F.who) return; const [x, y, a] = F.who; H.put('barrels', H.CX + x - Math.cos(a) * 1.6, H.CY + y - Math.sin(a) * 1.6, 0, { items: [{ u: 0, v: 0, r: 0.45, hh: 0.9 }] }); },
    enter() { Object.assign(RAID.st, { mine: 0, roll: null, rollT: 0 }); fpsFeed('A drowned sailor sits at an upturned barrel, rattling dice in a cup. He nods at you to sit down.'); },
    me(dt) { const S = RAID.st; if (S.rollT > 0) S.rollT -= dt; },
    consider(c) { if (!RAID.st.mine) { const [x, y] = friWho(); c({ k: 'frdice' }, x, y, 0, 2.6, false); } },
    prompt(o) { return o.k === 'frdice' ? { text: `Throw the dice with him: seven or more wins, under seven costs ${FRX.LOSE} points` } : null; },
    use(o) {
      if (o.k !== 'frdice') return false;
      const S = RAID.st; if (S.mine || !friAble()) return true;
      const a = 1 + ((Math.random() * 6) | 0), b = 1 + ((Math.random() * 6) | 0); S.mine = 1; S.roll = [a, b]; S.rollT = 3; zmSound('tick');
      if (a === 6 && b === 6) { fpsFeed('Double six. He laughs, a wet sound, and pays out twice.'); frcSpark(); friGift('The dicing man’s winnings'); }
      else if (a + b >= 7) friGift(`${a} and ${b}: the dicing man pays out`);
      else { const p = Math.min(ZM.pts, FRX.LOSE); ZM.pts -= p; ZM.spent += p; fpsHurt(1, null, null); zmSound('hit'); ZM.banner = { text: `${a} and ${b}`, t: 2.6, col: '#e06a50', sub: 'You lose' }; fpsFeed(`${a} and ${b}. He takes ${p} points, and a cold grip on your arm for your trouble.`); }
      return true;
    },
    readyLine: () => RAID.st.mine ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Throw the dice with the drowned sailor if you dare, then light the beacon',
    hud(phone) {
      const S = RAID.st; if (!(S.rollT > 0) || !S.roll) return;
      const s = phone ? 26 : 34, y = H / 2 + 50, al = Math.min(1, S.rollT);
      ctx.globalAlpha = al;
      S.roll.forEach((v, i) => {
        const x = cx + (i ? 8 : -8 - s); ctx.fillStyle = '#ece4cf'; ctx.fillRect(x, y, s, s); ctx.fillStyle = '#1a1612';
        const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[v];
        for (const [u, w] of P) { ctx.beginPath(); ctx.arc(x + s * (0.22 + u * 0.28), y + s * (0.22 + w * 0.28), s * 0.09, 0, 6.283); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
    },
    b3(grp) { const [x, y, a] = friWho(); friFigure(grp, x, y, -a + Math.PI / 2, 0x3a3428, 0x5a6a62); },
  }),
  casks: friLit({
    n: 'The Keeper’s Oil', ready0: true,
    set(H) {
      friUnknownSet(H); const F = H.I.zm.fr; if (!F) return; F.casks = [];
      for (let i = 0; i < FRX.CASKS; i++) { const at = H.spot(0.8, 8, H.IR - 5, 2.5, 300) || H.polar(i / FRX.CASKS * H.TAU, H.IR - 8); F.casks.push([at[0] - H.CX, at[1] - H.CY]); }
    },
    enter() { Object.assign(RAID.st, { ck: 0, ckT: 0, ckPend: 0 }); fpsFeed(`Casks of lamp oil, washed up from somewhere and scattered across the island: ${FRX.CASKS} of them. Broach them and the fog will draw back.`); },
    tick(dt) { friTrickle(dt, 2 + friN(), 5); },
    q(sid, k, a) {
      const S = RAID.st, i = a | 0, bit = 1 << i; if (k !== 'xcask' || i < 0 || i >= FRX.CASKS || S.ck & bit) return;
      S.ck |= bit; frFogPush(FRX.PUSH); const n = frxCount(S.ck);
      if (n >= FRX.CASKS) { friRare(); frIsleSay(`${friNick(sid)} broached the last cask. The fog draws right back, and the keeper’s oil is worth a rare card.`, true); }
      else frIsleSay(`${friNick(sid)} broached a cask: the oil catches and the fog draws back. ${n} of ${FRX.CASKS}.`, true);
    },
    me(dt) {
      const S = RAID.st, o = ZM.near; if (S.ckPend > 0) S.ckPend -= dt;
      if (friHold() && o && o.k === 'frcask' && friAble() && !(S.ck & (1 << o.i)) && !(S.ckPend > 0)) { S.ckT += dt; if (S.ckT >= FRX.BROACH) { S.ckT = 0; S.ckPend = 1.2; zmSound('open'); raidAsk('xcask', o.i); } } else S.ckT = 0;
    },
    consider(c) { const S = RAID.st; frxCasks().forEach(([x, y], i) => { if (!(S.ck & (1 << i))) c({ k: 'frcask', i }, x, y, 0, 2.2, false); }); },
    prompt(o) { return o.k === 'frcask' ? { text: 'Hold to broach the cask of lamp oil', hold: true } : null; },
    use(o) { return o.k === 'frcask'; },
    readyLine() { const n = frxCount(RAID.st.ck); return n >= FRX.CASKS ? 'Light the beacon (hold Use at it) when you’re ready to go' : `Find and broach the casks of lamp oil (${n} of ${FRX.CASKS}), or light the beacon and go`; },
    hud() { friRing(RAID.st.ckT, FRX.BROACH); },
    pack(o) { o.fx = [RAID.st.ck | 0]; },
    apply(o) { if (Array.isArray(o.fx)) RAID.st.ck = o.fx[0] | 0; },
    b3(grp) {
      const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c }), iron = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
      FRX3.casks = frxCasks().map(([x, y], i) => {
        const G = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 12), wood); body.position.y = 0.4; G.add(body);
        for (const h of [0.12, 0.68]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 12), iron); r.position.y = h; G.add(r); }
        G.position.copy(frxAt(x, y)); G.rotation.y = i; grp.add(G);
        const gl = frxGlow(grp, x, y, 1.1, 'rgba(255,220,140,0.85)', 'rgba(255,190,90,0)', 1.2);
        const fire = frxGlow(grp, x, y, 0.9, 'rgba(255,190,110,0.95)', 'rgba(255,120,50,0)', 2.2); fire.visible = false;
        return { G, gl, fire };
      });
      FRX3.on = true; FRX3.rule = 'casks';
    },
    f3() {
      if (!FRX3.on || FRX3.rule !== 'casks') return; const ck = RAID.st.ck | 0;
      FRX3.casks.forEach((c, i) => { const lit = !!(ck & (1 << i)); c.gl.visible = !lit; c.gl.material.opacity = 0.5 + 0.4 * Math.sin(g.t * 3 + i); c.fire.visible = lit; if (lit && !reduceMotion) c.fire.scale.set(2 + 0.3 * Math.sin(g.t * 11 + i), 2.6 + 0.4 * Math.sin(g.t * 7 + i), 1); });
    },
    exit: friDone3,
  }),
  gold: friLit({
    n: 'The Wreckers’ Gold', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { mine: 0, gN: 0, curse: 0 }); fpsFeed('Gold, heaped round an old figurehead on a cairn: the wreckers’ share, never spent. Nobody’s guarding it. Nobody you can see.'); },
    tick(dt) { const S = RAID.st; if (S.curse > 0) { S.curse -= dt; friTrickle(dt, 4 + 2 * friN(), 1.6); if (S.curse <= 0) frIsleSay('The island goes quiet again. The beacon will take now.', true); } else friTrickle(dt, 2 + friN(), 7); },
    q(sid, k) {
      const S = RAID.st; if (k !== 'xgold') return;
      S.gN++; S.curse = FRX.CURSE;
      for (let i = 0; i < 2 + FR.reach; i++) frIsleSpawn({ kind: 'run', hp: friHp() });
      frIsleSay(`${friNick(sid)} took a share of the gold. The ground heaves: the wreckers want it back.`, true);
    },
    consider(c) { if (!RAID.st.mine) { const [x, y] = friFar(); c({ k: 'frgold' }, x, y, 0, 2.6, false); } },
    prompt(o) { return o.k === 'frgold' ? { text: `Take a share of the gold (${FRX.GOLD * FR.reach} points), and wake its owners` } : null; },
    use(o) { if (o.k !== 'frgold') return false; const S = RAID.st; if (S.mine || !friAble()) return true; S.mine = 1; zmPoints(FRX.GOLD * FR.reach, true); zmSound('buy'); raidAsk('xgold'); return true; },
    readyLine() { const S = RAID.st; return S.curse > 0 ? `The wreckers want their gold back. The beacon won’t take for ${Math.ceil(S.curse)} s` : S.mine ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Take a share of the wreckers’ gold if you dare, then light the beacon'; },
    pack(o) { const S = RAID.st; o.fx = [S.gN | 0, Math.round(S.curse * 10)]; },
    apply(o) { const S = RAID.st; if (Array.isArray(o.fx)) { S.gN = o.fx[0] | 0; S.curse = (o.fx[1] | 0) / 10; } },
    b3(grp) {
      const [x, y] = friFar(), [lx, ly] = friLand(), a = Math.atan2(ly - y, lx - x), stone = new THREE.MeshLambertMaterial({ color: 0x6a6660 }), gold = new THREE.MeshLambertMaterial({ color: 0xc8a040, emissive: 0x3a2a08 });
      for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.12), stone), u = i / 9 * 6.283; r.position.copy(frxAt(x + Math.cos(u) * 0.8, y + Math.sin(u) * 0.8)); r.position.y += 0.25; grp.add(r); }
      for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), gold), u = i * 2.4, d = 0.4 + (i % 4) * 0.35; c.position.copy(frxAt(x + Math.cos(u) * d, y + Math.sin(u) * d)); c.position.y += 0.05 + (i % 3) * 0.05; c.rotation.set(0.3 * (i % 2), 0, 0.2 * (i % 3)); grp.add(c); }
      // the figurehead: a carved woman, salt-white, leaning out of the cairn towards the sea
      const fh = friFigure(grp, x, y, -a + Math.PI / 2, 0xd8d0c0, 0xd8d0c0); fh.rotation.x = -0.35; fh.position.y += 0.4;
      FRX3.glint = frxGlow(grp, x, y, 0.5, 'rgba(255,220,130,0.9)', 'rgba(255,190,80,0)', 2.2);
      FRX3.on = true; FRX3.rule = 'gold';
    },
    f3() { if (!FRX3.on || FRX3.rule !== 'gold') return; const S = RAID.st; FRX3.glint.material.opacity = S.curse > 0 ? 0.3 + 0.3 * Math.sin(g.t * 9) : 0.6 + 0.3 * Math.sin(g.t * 2); FRX3.glint.material.color.setHex(S.curse > 0 ? 0xff7050 : 0xffffff); },
    exit: friDone3,
  }),
  bargain: friLit({
    n: 'The Fog’s Bargain', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { mine: 0 }); fpsFeed('A standing stone, taller than a man, and the fog moving round it as if it breathed. Close to, it whispers.'); },
    consider(c) { if (!RAID.st.mine) { const [x, y] = friFar(); c({ k: 'frstone' }, x, y, 0, 2.6, false); } },
    prompt(o) { return o.k === 'frstone' ? { text: `Give the fog everything you carry (all your points, ${FRX.PRICE} at the least) for a relic` } : null; },
    use(o) {
      if (o.k !== 'frstone') return false;
      const S = RAID.st; if (S.mine || !friAble()) return true;
      const ks = Object.keys(FR_RELICS).filter(k => !(FR.rel || []).includes(k) && (!FR_RELICS[k].co || ZM.net) && (!FR_RELICS[k].u || frFragTier() >= FR_RELICS[k].u)), k = ks[(Math.random() * ks.length) | 0];
      if (ZM.pts < FRX.PRICE) { zmSound('no'); fpsFeed('“You carry nothing I want,” it whispers.'); return true; }
      if (!k) { zmSound('no'); fpsFeed('“You have all I could give,” it whispers.'); return true; }
      ZM.spent += ZM.pts; ZM.pts = 0; S.mine = 1; frcAddRelic(k); zmSound('offer');
      ZM.banner = { text: FR_RELICS[k].n, t: 3.2, col: FR_RELICS[k].c, sub: 'The fog’s bargain' }; fpsFeed(`The fog takes everything you carry, and leaves the ${FR_RELICS[k].n} in your hand: ${FR_RELICS[k].what}`);
      return true;
    },
    readyLine: () => RAID.st.mine ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Strike a bargain with the stone if you like, then light the beacon',
    b3(grp) {
      const [x, y] = friFar(), st = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 0.5), new THREE.MeshLambertMaterial({ color: 0x4a4e52 }));
      st.position.copy(frxAt(x, y)); st.position.y += 1.5; st.rotation.set(0.05, 0.7, -0.06); grp.add(st);
      FRX3.halo = frxGlow(grp, x, y, 1.8, 'rgba(190,210,230,0.6)', 'rgba(150,170,200,0)', 6);
      FRX3.on = true; FRX3.rule = 'bargain';
    },
    f3() { if (!FRX3.on || FRX3.rule !== 'bargain') return; FRX3.halo.material.opacity = RAID.st.mine ? 0.15 : 0.35 + 0.2 * Math.sin(g.t * 1.3); },
    exit: friDone3,
  }),
  bottle: friLit({
    n: 'A Message in a Bottle', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { mine: 0, fair: 0 }); fpsFeed('Something glints in the wrack by the landing: a bottle, corked and sealed, with paper in it.'); },
    q(sid, k) {
      const S = RAID.st; if (k !== 'xbottle' || S.fair) return;
      S.fair = 1; if (FR.crew) FR.crew.fair = (FR.stop | 0) + 1;
      frIsleSay(`${friNick(sid)} read the chart in the bottle: it shows a shorter way. A fair wind for the next sail.`, true);
    },
    consider(c) { if (!RAID.st.mine) { const [x, y] = friWho(); c({ k: 'frbottle' }, x, y, 0, 2.2, false); } },
    prompt(o) { return o.k === 'frbottle' ? { text: 'Read the message in the bottle' } : null; },
    use(o) {
      if (o.k !== 'frbottle') return false;
      const S = RAID.st; if (S.mine) return true; S.mine = 1; zmSound('take');
      if (typeof FK !== 'undefined') { FK.f += FRX.FRAGS; if (typeof frKeepSave === 'function') frKeepSave(); }
      fpsFeed(`An old chart of these waters, in a keeper’s hand: ${FRX.FRAGS} chart fragments, yours to keep.`); raidAsk('xbottle');
      return true;
    },
    readyLine: () => RAID.st.mine ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Read the message in the bottle, then light the beacon (hold Use at it)',
    pack(o) { o.fx = [RAID.st.fair | 0]; },
    apply(o) { if (Array.isArray(o.fx)) RAID.st.fair = o.fx[0] | 0; },
    b3(grp) {
      const [x, y] = friWho(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 10), new THREE.MeshLambertMaterial({ color: 0x3a7a5a, emissive: 0x0a2018, transparent: true, opacity: 0.85 }));
      b.position.copy(frxAt(x, y)); b.position.y += 0.1; b.rotation.set(Math.PI / 2, 0, 0.6); grp.add(b);
      FRX3.bottle = b; FRX3.glint = frxGlow(grp, x, y, 0.3, 'rgba(200,255,220,0.9)', 'rgba(150,220,180,0)', 1.1);
      FRX3.on = true; FRX3.rule = 'bottle';
    },
    f3() { if (!FRX3.on || FRX3.rule !== 'bottle') return; const m = RAID.st.mine; FRX3.bottle.visible = !m; FRX3.glint.visible = !m; FRX3.glint.material.opacity = 0.5 + 0.4 * Math.sin(g.t * 3.5); },
    exit: friDone3,
  }),
});
function frxCount(b) { let n = 0; for (let i = 0; i < FRX.CASKS; i++) if (b & (1 << i)) n++; return n; }
// (no lighting the beacon and leaving while the castaway's being kept, or while the gold's curse holds)
{ const C = FRI_UNKNOWN.castaway, q0 = C.q; C.q = (sid, k, a) => { if (k === 'light' && RAID.st.cw === 1) return; q0(sid, k, a); }; }
{ const G = FRI_UNKNOWN.gold, q0 = G.q; G.q = (sid, k, a) => { if (k === 'light' && RAID.st.curse > 0) return; q0(sid, k, a); }; }
// the chart draws from them all
if (FR_KINDS.unknown) FR_KINDS.unknown.rules = Object.keys(FRI_UNKNOWN);
