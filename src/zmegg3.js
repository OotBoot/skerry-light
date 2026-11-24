// The San Telmo: what her captain owed, and what it pays in. The third map's own secret (the Lighthouse keeps its own
// in src/zmegg.js, Wrackhaven its own in src/zmegg2.js), for whoever goes looking: nothing on screen or in the README
// says how it goes. The cues are in the world: a glint, a line in the feed in someone else's voice (her captain's, or
// the ship's boy's who turned the glass), a word over Use in just the right place. It pays a pirate token, as the
// others do (ptGrant, in src/zmegg.js), one for each night it's done; its coin is the San Telmo's Piece of Eight.
//
// ---------------------------------------------------------------------------------------------------------------
// THE SOLUTION (spoilers; kept to this comment on purpose). "The Last Pay": the winter of 1597, the night she struck
// the Skerries. The crew were two years owed, the pay locked in the squadron's coffer under three keys (the captain's,
// the master's, the chaplain's, as the King's chests always were); the stern lanterns blew out in the gale, the ship's
// boy fell asleep and let the half-hour glass run down, and she went onto the rocks with all hands, unpaid. In order:
//   1. The Great Cabin: a glint on the charts on the captain's table. Use it: Don Rodrigo's last entry (the lanterns
//      out, the glass, the three keys, "every man shall be paid at the capstan").
//   2. The Steerage: the hourglass rack on the forward bulkhead glints. Use it to turn the glass, which only takes in
//      the quiet between rounds. The boy sings the watch prayer, and the sand runs (ZS_SAND seconds).
//   3. The Quarterdeck: before the sand runs out, set St Elmo's fire in each of the three great stern lanterns: a
//      globe from the Corposant drifting close by each one lights it blue (nothing else will: a bullet only makes it
//      gutter). If the sand runs out first, the fire goes out of them all, and the glass must be turned again.
//   4. The Chaplain's Berth (the Gun Deck aft): kill eight of the drowned in the berth itself. Each one's light goes
//      to a candle on the altar.
//   5. The reliquary on the altar has opened (it glints). Use it: the chaplain's key. Whoever takes the first of
//      the three keys carries the ring, and only they can add to it.
//   6. The Forecastle Deck: something glints under the belfry's beam, out of reach. Shoot the cord it hangs by (or
//      cut it with the cutlass): the master's key drops to the deck.
//   7. Use it where it fell.
//   8. The Steerage: the captain's key, on a cord knotted round the whipstaff, glints now. Use it.
//      (5, 6 to 7 and 8 go in any order, once the altar is lit; the master's key, once down, stays down.)
//   9. The Strong Room: the iron coffer on the floor before the pay chest (it says "three locks" over Use from the
//      first). With all three keys, Use it: it opens, and whoever has the keys takes up the bag of pay.
//  10. The Waist: carry the pay up to the capstan and Use it to call the pay. The crew's lights come to the capstan,
//      San Telmo's fire burns on her three mastheads, eight bells, and the Piece of Eight drops: a pirate token.
// If whoever carries the keys or the pay bleeds out or leaves, it goes back (each key where it was found, the master's
// on the deck under the bell; the pay into the open coffer; the altar needn't be lit twice).
// Together (src/zmnet.js): the host keeps it, as it keeps the rest of the night (`eg3` in its presence); anyone can
// do a step (a client asks with the 'egg3' request); a globe lights a lantern on the screen of whoever threw it, who
// asks; kills by anyone count; everyone in the night gets a token.
// ---------------------------------------------------------------------------------------------------------------
//
// Hooks (each marked "[egg3 hook]"): zombies.js zmReset, zmTick, zmKill, zmResolveShot, zmMelee, zmNearest,
// zmPrompt, zmUse, zm3dBuild, zmScene3D, zmHud; zmnet.js the request, the host's send and the client's apply;
// zmcrab.js and zmelmo.js the Hermit's Claw's snap and the Corposant's throw (as shots), and each of the Corposant's
// globes as it drifts (zsOrb).

const ZS_N = 8, ZS_SAND = 90, ZS_END = 8;
// st: 0 nothing yet; 1 the entry read; 2 the glass turned, the sand running; 3 the lanterns lit, the altar waiting;
// 4 the altar lit, the keys to find; 5 the keys being gathered (carried); 6 the coffer open, the pay in it; 7 the pay
// carried; 8 done
const ZS = { st: 0, carrier: null, souls: 0, lit: 0, keys: 0, fell: false, sand: 0, later: [], P: null, cele: 0, granted: false, t: 0, said: {}, asked: [-9, -9, -9], myCut: -9, flare: 0 };

// where everything is (relative to the island's middle, as the map's own layout in src/zmgalleon.js): x, y, z where
// it's drawn and struck; ux, uy, uz where you stand to use it (the decks at 0, 4.4, 8.8 and 13.2)
function zsPlaces() {
  const OX = FPSC.CX, OY = FPSC.CY, [F0, F1, F2, F3] = ZGL.F, A = (x, y, z, ux, uy, uz) => ({ x: OX + x, y: OY + y, z, ux: OX + (ux == null ? x : ux), uy: OY + (uy == null ? y : uy), uz: uz == null ? 0 : uz });
  return {
    table: A(-37.6, -1.95, F2 + 0.9, -37.2, -0.4, F2),                       // the Great Cabin: the charts on the captain's table (x -37, y -2)
    glass: A(-14.45, -4.83, F2 + 1.7, -15.3, -5, F2),                        // the Steerage: the hourglass rack on the bulkhead (x -14.3, y -5)
    lan: [A(-47.3, -6, 16.2), A(-47.3, 0, 17.6), A(-47.3, 6, 16.2)],         // the three stern lanterns, over the taffrail
    altar: A(-42.15, 0, F1 + 1.0, -41.2, 0, F1), relic: A(-42.7, 0, F1 + 1.45, -41.2, 0, F1),   // the Chaplain's Berth: the altar (x -42.5), its reliquary
    bkey: A(25.15, 0, F3 + 2.3, 25.15, -1.1, F3), bfloor: A(25.15, -0.4, F3 + 0.04, null, null, F3),   // the Forecastle Deck: under the belfry's beam (x 24.5)
    bell: A(24.5, 0, F3 + 2.0),                                                // the ship's bell
    whip: A(-18.9, 0.25, F2 + 1.5, -19.2, -1.0, F2),                         // the Steerage: the whipstaff (x -19)
    arca: A(-42.15, 1.0, F0, -42.95, 1.0, F0),                               // the Strong Room: on the floor before the pay chest (x -40.5, its front aft)
    cap: A(-10, 2.5, F2 + 1.48, -10, 1.15, F2),                              // the Waist: the capstan's head (x -10, y 2.5)
    masts: [[-24, 34.4], [-4, 52.4], [15, 46.4]].map(([x, z]) => A(x, 0, z)),  // her three mastheads (src/zmgalleon.js MASTS)
  };
}
function zsReset() {
  Object.assign(ZS, { st: 0, carrier: null, souls: 0, lit: 0, keys: 0, fell: false, sand: 0, later: [], cele: 0, granted: false, t: 0, said: {}, asked: [-9, -9, -9], myCut: -9, flare: 0 });
  ZS.P = ZM_MAP === 'galleon' && FPS.g && FPS.g.isle && FPS.g.isle.zm ? zsPlaces() : null;
}
const zsMine = () => ZS.carrier && ZS.carrier === FPS.me.id;
const zsHunt = st => st === 4 || st === 5;   // (the keys about)
const zsCan = () => ZS.st === 4 || (ZS.st === 5 && zsMine());   // (can I take a key: the first, or I've the ring)
function zsCarrierBody() { if (!ZS.carrier) return null; if (ZS.carrier === FPS.me.id) return FPS.me; return FPS.remote.get(ZS.carrier) || null; }
const zsSay = (t, s) => zeSay(t, s);
// (a whisper keeps to the step it was meant for: if the night has moved on by then, it goes unsaid)
function zsWhisper(text, delay) { const st = ZS.st; ZS.later.push({ t: delay || 0, f: () => { if (ZS.st !== st) return; zeSay(text, 8); zeSound('whisper'); } }); }
function zsLater(delay, f) { ZS.later.push({ t: delay, f }); }
const ZS_LOG = '“Middle watch, the fourth glass. The lanterns are blown out and the squadron lost to sight; the boy has stopped singing. The pay is two years owing, under the three keys, mine, the master’s and the chaplain’s. If God brings us in, every man shall be paid at the capstan, on my honour. R. de A.”';
const ZS_SONG = '“Bendita la hora en que Dios nació… buena es la que va, mejor es la que viene…”';

// what happens when it moves on (on everyone's own screen)
function zsEnter(st, prev) {
  const P = ZS.P;
  if (st < prev) {
    if (st === 1) { zsSay('The last of the sand runs through. San Telmo’s fire goes out of the lanterns.', 8); zeSound('fizzle'); zsWhisper('“Turn it, turn it again… I won’t sleep this time…”', 1.5); }
    else if (st === 4) zsSay('The keys are gone from the ring, back where they were kept.');
    else if (st === 6) zsSay('Far below, a heavy bag drops back into an iron coffer.');
    return;
  }
  if (st === 1) {
    zsSay('The captain’s journal, open on the charts, the last entry in a hurried hand:', 10);
    zsSay(ZS_LOG, 14); zeSound('page');
    zsWhisper('“I let the glass run out, señor. I didn’t turn it…”', 3.5);
  } else if (st === 2) {
    zsSay('You turn the glass. The sand begins to run, and somewhere in the dark a boy is singing:', 10);
    zsSay(ZS_SONG, 10); zeSound('take');
    zsWhisper('“¡Los faroles! Light the lanterns before the glass runs down.”', 4);
    zsWhisper('“No common flame will hold in this wind. San Telmo’s own fire, for San Telmo’s lanterns.”', 9);
  } else if (st === 3) {
    zsSay('The three great lanterns burn blue with the saint’s fire. Far forward, the ship’s bell strikes once, by itself.', 10); zeSound('bell', P && P.bell.x, P && P.bell.y, 0.6);
    zsWhisper('“Father Anselmo heard us at the altar, all that could get down to him. The rest went unshriven.”', 4);
  } else if (st === 4) {
    zsSay(`${ZS_N} candles burn on the altar. The little door of the reliquary has swung open.`, 10); zeSound('soul');
    zsWhisper('“The chaplain kept his key with the saint. The master hid his where only the bell could see it.”', 3.5);
  } else if (st === 7 && prev === 5) {
    zsSay('Three keys, three locks, in turn. The coffer opens: the pay book, and a heavy bag of silver.', 10); zeSound('clank', P && P.arca.x, P && P.arca.y, 0.6);
    zsWhisper('“Call it at the capstan, as it should have been called.”', 3.5);
  } else if (st === 7) zsSay('You take up the bag of pay again.');
  else if (st === ZS_END) zsFinish();
}
// a key taken onto the ring (bit: 1 the chaplain's, 2 the master's, 4 the captain's), and what's still to find
function zsGot(bit) {
  zeSound('take');
  if (bit === 1) zsSay('A small iron key, a rosary twisted through its bow. One of three.');
  else if (bit === 2) zsSay('A long key, an anchor cut in its bow: the master’s.');
  else zsSay('A key on a cord, knotted fast round the whipstaff. The captain’s.');
  const k = ZS.keys | bit;   // (whether or not it's on the ring yet)
  if (k === 7) { zsLater(1.2, () => { zsSay('Three keys on the one ring. Far below, in the Strong Room, something iron settles.', 9); zeSound('thunk'); }); zsWhisper('“The coffer, below, with the pay.”', 3.5); }
  else if (!(k & 4)) zsWhisper('“Mine I kept on me. I held her myself at the last.”', 3.5);
  else if (!(k & 2)) zsWhisper('“The master hid his where only the bell could see it.”', 3.5);
  else zsWhisper('“The chaplain kept his with the saint.”', 3.5);
}
function zsFell() { const P = ZS.P; zsSay('The cord parts. Something drops ringing onto the deck under the bell.'); zeSound('bell', P.bell.x, P.bell.y, 0.25); }
function zsLit(i) { const L = ZS.P.lan[i]; zsSay(i === 1 ? 'The great lantern takes the saint’s fire.' : `The ${i ? 'larboard' : 'starboard'} lantern burns blue.`, 6); zlSound('zap', Math.hypot(L.x - FPS.me.x, L.y - FPS.me.y)); zeSound('light', L.x, L.y); ZS.flare = Math.max(ZS.flare, 0.6); }
function zsFinish() {
  ZS.cele = 8; ZS.flare = 4;
  FPS.flash = 0.6;
  ZM.banner = { text: 'Paid in full', t: 3.5, col: '#d0e8ff' };
  zeSound('eight');
  zsSay('You set the pay on the capstan head and call the first name in the book. Out of the dark, one by one, they come to be paid.', 12);
  zsLater(2.4, () => { zsSay('San Telmo’s fire burns on her mastheads, and the sea goes quiet. On the capstan head lies a silver coin.', 12); zeSound('coin'); });
  zsWhisper('“Gracias, señor. Buenas noches.”', 6);
  if (!ZS.granted) { ZS.granted = true; zsLater(2.4, () => { if (typeof ptGrant === 'function') ptGrant(); }); }
}

// ---------- doing it ----------
function zsDo(a) { if (ZM.net === 'client') { if (typeof zmnRequest === 'function') zmnRequest('egg3', a); } else zsAct(FPS.me.id, a); }
function zsSet(st) { const prev = ZS.st; if (st === prev) return; ZS.st = st; zsEnter(st, prev); }
function zsAct(sid, a) {
  const st = ZS.st;
  if (a === 'table') { if (st === 0) zsSet(1); }
  else if (a === 'glass') { if (st === 1 && ZM.phase !== 'round') { ZS.sand = ZS_SAND; ZS.lit = 0; zsSet(2); } }
  else if (a === 'lan0' || a === 'lan1' || a === 'lan2') {
    const i = +a[3], bit = 1 << i; if (st !== 2 || (ZS.lit & bit)) return;
    ZS.lit |= bit; zsLit(i);
    if (ZS.lit === 7) { ZS.souls = 0; zsSet(3); }
  }
  else if (a === 'cut') { if (zsHunt(st) && !ZS.fell) { ZS.fell = true; zsFell(); } }
  else if (a === 'relic' || a === 'mkey' || a === 'ckey') {
    const bit = a === 'relic' ? 1 : a === 'mkey' ? 2 : 4;
    if (!zsHunt(st) || (ZS.keys & bit) || (bit === 2 && !ZS.fell)) return;
    if (st === 5 && ZS.carrier !== sid) return;
    ZS.keys |= bit;
    if (st === 4) { ZS.carrier = sid; zsSet(5); }
    zsGot(bit);
  }
  else if (a === 'arca') { if (st === 5 && ZS.carrier === sid && ZS.keys === 7) zsSet(7); else if (st === 6) { ZS.carrier = sid; zsSet(7); } }
  else if (a === 'pay') { if (st === 7 && ZS.carrier === sid) { ZS.carrier = null; zsSet(ZS_END); } }
}
function zsRequest(sid, a) { if (ZS.P && typeof a === 'string') zsAct(sid, a.slice(0, 8)); }

// ---------- each frame ----------
function zsTick(dt) {
  if (!ZS.P) return;
  ZS.t += dt;
  for (const l of ZS.later) l.t -= dt;
  const due = ZS.later.filter(l => l.t <= 0); ZS.later = ZS.later.filter(l => l.t > 0);
  for (const l of due) try { l.f(); } catch (e) {}
  if (ZS.cele > 0) ZS.cele -= dt;
  if (ZS.flare > 0) ZS.flare -= dt;
  if (ZS.st === 2) ZS.sand = Math.max(0, ZS.sand - dt);
  if (ZM.net === 'client') return;
  // the sand run out before the lanterns were lit: all of it again, from the glass
  if (ZS.st === 2 && ZS.sand <= 0) { ZS.lit = 0; zsSet(1); }
  if (ZS.carrier) {
    let gone = false;
    if (ZS.carrier === FPS.me.id) gone = !!ZM.ghost || !!ZM.over;
    else { const r = FPS.remote.get(ZS.carrier); gone = !r || r.left || (r.dead && !r.down); }
    if (gone) { ZS.carrier = null; if (ZS.st === 5) { ZS.keys = 0; zsSet(4); } else if (ZS.st === 7) zsSet(6); }
  }
}
// a kill in the Chaplain's Berth, once the lanterns are lit: one more of them shriven, a candle on the altar
function zsKill(d) {
  if (!ZS.P || ZM.net === 'client' || ZS.st !== 3) return;
  if (zmZoneAt(d.x, d.y, d.jz || 0) !== 'chapel') return;
  ZS.souls++; zsWisp(d.x, d.y, d.jz || 0); zeSound('soul', ZS.P.altar.x, ZS.P.altar.y);
  if (ZS.souls >= ZS_N) zsSet(4);
}
function zsWisp(x, y, jz) {
  const Q = ZS.P.altar, G0 = FPSC.GROUND, z0 = G0 + jz + 1.2, z1 = G0 + Q.z + 0.15;
  for (let i = 0; i < 7; i++) { const T = 0.9 + i * 0.05; FPS.parts.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, z: z0, vx: (Q.x - x) / T, vy: (Q.y - y) / T, vz: (z1 - z0) / T, t: T, c: i % 2 ? '255,226,160' : '200,226,255', up: true }); }
}
// one of my Corposant's globes, as it drifts: close by a stern lantern while the sand runs, it lights it
function zsOrb(O) {
  const P = ZS.P; if (!P || ZS.st !== 2) return;
  const G0 = FPSC.GROUND;
  P.lan.forEach((L, i) => {
    if ((ZS.lit & (1 << i)) || ZS.t - ZS.asked[i] < 1) return;
    if (Math.hypot(O.x - L.x, O.y - L.y, O.z - (G0 + L.z)) > (i === 1 ? 2.1 : 1.7)) return;
    ZS.asked[i] = ZS.t;
    if (typeof ZL !== 'undefined') ZL.arcs.push({ a: O, b: [L.x, L.y, G0 + L.z], t: 0, life: 0.35, w: 1.6, small: false, seed: Math.random() * 1000 });
    zsDo('lan' + i);
  });
}

// ---------- what's in front of you ----------
function zsNearest(consider) {
  const P = ZS.P; if (!P) return;
  const st = ZS.st, mine = zsMine(), can = zsCan(), hunt = zsHunt(st);
  consider({ k: 'egg3', a: 'table' }, P.table.ux, P.table.uy, P.table.uz, 1.5, true);
  if (st === 1 || st === 2) consider({ k: 'egg3', a: 'glass' }, P.glass.ux, P.glass.uy, P.glass.uz, 1.4, true);
  if (hunt && !(ZS.keys & 1) && can) consider({ k: 'egg3', a: 'relic' }, P.relic.ux, P.relic.uy, P.relic.uz, 1.5, true);
  if (hunt && !ZS.fell) consider({ k: 'egg3', a: 'bell' }, P.bkey.ux, P.bkey.uy, P.bkey.uz, 1.5, true);
  if (hunt && ZS.fell && !(ZS.keys & 2) && can) consider({ k: 'egg3', a: 'mkey' }, P.bfloor.ux, P.bfloor.uy, P.bfloor.uz, 1.3, false);
  if (hunt && !(ZS.keys & 4) && can) consider({ k: 'egg3', a: 'ckey' }, P.whip.ux, P.whip.uy, P.whip.uz, 1.5, true);
  if (st < 7) consider({ k: 'egg3', a: 'arca' }, P.arca.ux, P.arca.uy, P.arca.uz, 1.4, true);
  if (st === 7 && mine) consider({ k: 'egg3', a: 'pay' }, P.cap.ux, P.cap.uy, P.cap.uz, 1.6, true);
}
function zsPrompt(o) {
  const st = ZS.st, mine = zsMine();
  if (o.a === 'table') return { text: st === 0 ? 'A book lies open on the charts' : 'The captain’s journal', free: true };
  if (o.a === 'glass') return st === 1 ? { text: 'Turn the glass', free: true } : { text: 'The sand is running' };
  if (o.a === 'relic') return { text: 'The reliquary stands open', free: true };
  if (o.a === 'bell') return { text: 'Something hangs from the belfry’s beam, out of reach' };
  if (o.a === 'mkey') return { text: 'Something lies on the deck', free: true };
  if (o.a === 'ckey') return { text: 'The whipstaff', free: true };
  if (o.a === 'arca') return st === 5 && mine && ZS.keys === 7 ? { text: 'Turn the three keys', free: true } : st === 6 ? { text: 'Take up the pay', free: true } : { text: 'An iron coffer: three locks' };
  if (o.a === 'pay') return { text: 'Call the pay', free: true };
  return null;
}
function zsUse(o) {
  const st = ZS.st, mine = zsMine();
  if (o.a === 'table') { if (st === 0) zsDo('table'); else { zsSay(ZS_LOG, 10); zeSound('page'); } return; }
  if (o.a === 'glass') {
    if (st !== 1) return;
    if (ZM.phase === 'round') { zeSound('fizzle'); zsSay('The glass jumps in its rack and the sand won’t fall true. Not while the sea’s this loud.', 5); return; }
    zsDo('glass'); return;
  }
  if (o.a === 'relic' || o.a === 'mkey' || o.a === 'ckey') { zsDo(o.a); return; }
  if (o.a === 'bell') { zeSound('rustle'); if (!ZS.said.reach) { ZS.said.reach = true; zsSay('You can’t reach it.', 4); } return; }
  if (o.a === 'arca') {
    if ((st === 5 && mine && ZS.keys === 7) || st === 6) { zsDo('arca'); return; }
    zeSound('thunk', ZS.P.arca.x, ZS.P.arca.y); if (!ZS.said.arca) { ZS.said.arca = true; zsSay('Locked fast. Three locks, and three keys to them.', 5); }
    return;
  }
  if (o.a === 'pay') { if (st === 7 && mine) zsDo('pay'); }
}

// ---------- striking things ----------
// a shot (one of its lines): the cord under the belfry's beam; and a stern lantern, which a bullet only makes gutter
function zsShot(x, y, z, h, p, by) {
  const P = ZS.P; if (!P) return;
  // (as a ball of R about it, in 3D: the stern lanterns are steeply above you from the Quarterdeck)
  const hitAt = (q, R) => {
    const cp = Math.cos(p), dx = Math.sin(h) * cp, dy = Math.cos(h) * cp, dz = Math.sin(p), ox = q.x - x, oy = q.y - y, oz = FPSC.GROUND + q.z - z, along = ox * dx + oy * dy + oz * dz; if (along < 0 || along > 60) return false;
    const side2 = ox * ox + oy * oy + oz * oz - along * along; if (side2 > R * R) return false;
    const t = (along - Math.sqrt(R * R - side2)) * cp, wall = fpsRay(x, y, z, h, p, by, [], t + 1); return !(wall.t < t - 0.08);
  };
  if (zsHunt(ZS.st) && !ZS.fell && hitAt(P.bkey, 0.3)) zsCut();
  if (ZS.st === 2 && FPS.weapon !== 'corposant' && !ZS.said.gutter && P.lan.some((L, i) => hitAt(L, i === 1 ? 0.8 : 0.6))) { ZS.said.gutter = true; zeSound('fizzle', P.lan[1].x, P.lan[1].y); zsSay('The flame gutters, and steadies. No common fire will do.', 5); }
}
function zsMelee(x, y, z, h, w) {
  const P = ZS.P; if (!P || !zsHunt(ZS.st) || ZS.fell) return;
  const reach = (w.reach || 2) + 0.6, q = P.bkey, d = Math.hypot(q.x - x, q.y - y);
  if (d < reach && (d < 0.5 || Math.abs(angDiff(bearingOf(q.x - x, q.y - y), h)) < (w.arc || 0.9) + 0.15) && Math.abs(FPSC.GROUND + q.z - z) < 1.3) zsCut();
}
function zsCut() { if (ZS.t - ZS.myCut < 0.5) return; ZS.myCut = ZS.t; zeSound('cut'); zsDo('cut'); }

// ---------- together: the host's word ----------
function zsHostSend(z) { if (ZS.P) z.eg3 = [ZS.st, ZS.carrier || '', ZS.souls, ZS.lit, ZS.keys, ZS.fell ? 1 : 0, Math.round(ZS.sand * 10)]; }
function zsApply(hz) {
  const e = hz && hz.eg3;
  if (!Array.isArray(e) || !ZS.P) return;
  const st = Math.max(0, Math.min(ZS_END, e[0] | 0)), carrier = typeof e[1] === 'string' && e[1] ? e[1].slice(0, 40) : null;
  const souls = Math.max(0, Math.min(99, e[2] | 0)), lit = (e[3] | 0) & 7, keys = (e[4] | 0) & 7, fell = !!e[5], sand = Math.max(0, Math.min(ZS_SAND, (+e[6] || 0) / 10));
  ZS.carrier = carrier;
  for (const i of [0, 1, 2]) if ((lit & (1 << i)) && !(ZS.lit & (1 << i))) zsLit(i);
  ZS.lit = lit;
  if (fell && !ZS.fell) zsFell();
  ZS.fell = fell;
  if (st === 3 && souls > ZS.souls) { const Q = ZS.P.altar; for (let i = ZS.souls; i < souls; i++) zsWisp(Q.x + 2 + Math.random() * 6, Q.y + (Math.random() - 0.5) * 8, ZGL.F[1]); zeSound('soul', Q.x, Q.y); }
  ZS.souls = souls;
  if (st === 2) ZS.sand = sand;
  if (st !== ZS.st) { const prev = ZS.st; ZS.st = st; zsEnter(st, prev); }
  // (the keys after the step, so what's still to find is said on the step the ring is on)
  for (const bit of [1, 2, 4]) if ((keys & bit) && !(ZS.keys & bit)) { ZS.keys |= bit; zsGot(bit); }
  ZS.keys = keys;
}

// ---------- in 3D ----------
const Z3S = {};
function zs3dBuild(grp) {
  Z3S.ok = false; if (!ZS.P || typeof THREE === 'undefined') return;
  const P = ZS.P, G0 = FPSC.GROUND, soft = z3Soft('rgba(255,250,225,1)', 'rgba(255,250,225,0)');
  const sprite = (c, sc, par) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(sc || 1); (par || grp).add(s); return s; };
  const glint = c => { const s = sprite(c || '#fff4d0'), h = sprite(c || '#fff4d0'); s.visible = h.visible = false; return { s, h }; };
  Z3S.gl = { table: glint(), glass: glint('#ffe8b8'), relic: glint('#ffe0a8'), bkey: glint(), mkey: glint(), ckey: glint(), arca: glint('#e8e0c8'), cap: glint('#d8e8ff') };
  Z3S.glL = new THREE.PointLight(0xfff0d0, 0, 2.6, 2); grp.add(Z3S.glL);
  const iron = new THREE.MeshPhongMaterial({ color: 0x3a3c40, specular: 0x8a8c90, shininess: 40 }), brass = new THREE.MeshPhongMaterial({ color: 0x9a7a34, specular: 0xd0b060, shininess: 60, emissive: 0x181006 }), cord = z3Lam('#8a7a5a'), hide = z3Lam('#5a3e26'), oak = z3Lam('#3e2a1c');
  const K = zeKit();
  // a key: its bow, the shank, the bit (its origin at the bow; it hangs down -y)
  const key = (mat, sc) => { const g = new THREE.Group(); K.add(mat, new THREE.TorusGeometry(0.03, 0.009, 5, 12), 0, 0, 0); K.add(mat, new THREE.CylinderGeometry(0.008, 0.008, 0.15, 5), 0, -0.1, 0); K.add(mat, new THREE.BoxGeometry(0.04, 0.03, 0.01), 0.022, -0.16, 0); K.add(mat, new THREE.BoxGeometry(0.025, 0.012, 0.01), 0.015, -0.12, 0); K.into(g); g.scale.setScalar(sc || 1); grp.add(g); return g; };
  // the master's key, on its cord under the belfry's beam, then on the deck
  { const g = key(iron, 1.3), sl = 0.32, c = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, sl, 4), cord); c.position.copy(z3v(P.bkey.x, P.bkey.y, G0 + P.bkey.z + 0.04 + sl / 2)); grp.add(c); Z3S.mkey = { g, c }; }
  // the captain's key, on its cord round the whipstaff; the chaplain's in the reliquary
  { const g = key(brass, 1.2); g.position.copy(z3v(P.whip.x, P.whip.y, G0 + P.whip.z)); g.rotation.set(0, 0.4, 0); const r = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 4, 12), cord); r.position.copy(z3v(P.whip.x - 0.02, P.whip.y - 0.05, G0 + P.whip.z + 0.06)); r.rotation.x = Math.PI / 2; grp.add(r); Z3S.ckey = { g, r }; }
  { const g = key(iron, 0.9); g.position.copy(z3v(P.relic.x + 0.05, P.relic.y, G0 + P.relic.z + 0.02)); g.rotation.set(0, Math.PI / 2, 0); Z3S.rkey = g; }
  // the ring of keys in hand
  { const g = new THREE.Group(); grp.add(g); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 5, 14), iron); g.add(ring); Z3S.ring = { g, k: [] };
    for (let i = 0; i < 3; i++) { const k = key(i === 2 ? brass : iron, 0.8); grp.remove(k); k.position.set(-0.03 + i * 0.03, -0.04, 0); k.rotation.z = (i - 1) * 0.35; g.add(k); Z3S.ring.k.push(k); }
    g.visible = false; }
  // the coffer: an iron-bound box on the floor before the pay chest, three hasps, its lid on hinges at the back
  { const g = new THREE.Group(); g.position.copy(z3v(P.arca.x, P.arca.y, G0 + P.arca.z)); g.rotation.y = -Math.PI / 2; grp.add(g);
    K.add(oak, new THREE.BoxGeometry(0.7, 0.4, 0.45), 0, 0.2, 0);
    for (const u of [-0.3, 0, 0.3]) K.add(iron, new THREE.BoxGeometry(0.05, 0.42, 0.47), u, 0.2, 0);
    for (const u of [-0.2, 0, 0.2]) { K.add(brass, new THREE.BoxGeometry(0.08, 0.1, 0.02), u, 0.3, -0.235); K.add(z3Lam('#141210'), new THREE.BoxGeometry(0.015, 0.035, 0.01), u, 0.29, -0.247); }
    K.into(g);
    const lid = new THREE.Group(); lid.position.set(0, 0.4, 0.225); g.add(lid);
    K.add(oak, new THREE.BoxGeometry(0.72, 0.08, 0.47), 0, 0.04, -0.225); for (const u of [-0.3, 0, 0.3]) K.add(iron, new THREE.BoxGeometry(0.05, 0.09, 0.48), u, 0.04, -0.225);
    K.into(lid); Z3S.arca = { g, lid, open: 0 }; }
  // the bag of pay: leather, tied at the neck
  { const g = new THREE.Group(); grp.add(g); K.add(hide, new THREE.SphereGeometry(0.13, 10, 8), 0, 0.1, 0, 0, 0, 0, [1, 0.85, 1]); K.add(hide, new THREE.CylinderGeometry(0.035, 0.07, 0.08, 8), 0, 0.23, 0); K.add(cord, new THREE.TorusGeometry(0.04, 0.008, 4, 10), 0, 0.24, 0, Math.PI / 2, 0, 0); K.into(g); g.visible = false; Z3S.bag = g; }
  // the hourglass's sand, running
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 4), new THREE.MeshBasicMaterial({ color: 0xe8c890 })); m.position.copy(z3v(P.glass.x, P.glass.y, G0 + P.glass.z - 0.05)); m.visible = false; grp.add(m); Z3S.sand = m; }
  // San Telmo's fire in the three stern lanterns, and on her mastheads at the last
  Z3S.lan = P.lan.map((L, i) => { const s = i === 1 ? 1.35 : 1, a = sprite('#bfe4ff', 1.5 * s), b = sprite('#8ac0ff', 4.2 * s); a.position.copy(z3v(L.x, L.y, G0 + L.z)); b.position.copy(a.position); a.visible = b.visible = false; return { a, b, s }; });
  Z3S.lanL = new THREE.PointLight(0x9ec8ff, 0, 22, 1.4); Z3S.lanL.position.copy(z3v(P.lan[1].x + 1.5, P.lan[1].y, G0 + P.lan[1].z - 0.8)); grp.add(Z3S.lanL);
  Z3S.mast = P.masts.map(M => { const a = sprite('#c8e8ff', 1.8), b = sprite('#8ac0ff', 5); a.position.copy(z3v(M.x, M.y, G0 + M.z)); b.position.copy(a.position); a.visible = b.visible = false; return { a, b }; });
  // the votive candles on the altar's front edge, one for each soul
  { const g = new THREE.Group(); g.position.copy(z3v(P.altar.x, P.altar.y, G0 + P.altar.z)); grp.add(g);
    K.add(brass, new THREE.BoxGeometry(0.08, 0.02, 1.2), 0, 0.01, 0); for (let i = 0; i < ZS_N; i++) K.add(z3Lam('#e8e0c8', { emissive: 0x201c14 }), new THREE.CylinderGeometry(0.018, 0.018, 0.09, 6), 0, 0.065, -0.525 + i * 0.15);
    K.into(g); Z3S.flames = []; for (let i = 0; i < ZS_N; i++) { const s = sprite('#ffd890', 0.09); s.position.copy(z3v(P.altar.x, P.altar.y + 0.525 - i * 0.15, G0 + P.altar.z + 0.14)); s.visible = false; Z3S.flames.push(s); } }
  // the crew come to be paid: small lights round the capstan at the last
  Z3S.crew = []; for (let i = 0; i < 14; i++) { const s = sprite(i % 2 ? '#d8ecff' : '#ffe8c0', 0.5); s.visible = false; Z3S.crew.push(s); }
  Z3S.ok = true;
}
function zs3d(dt) {
  if (!Z3S.ok || !ZS.P || !Z3S.gl.table.s.parent) return;
  const P = ZS.P, t = g.t, G0 = FPSC.GROUND, st = ZS.st, m = FPS.me, mine = zsMine(), can = zsCan(), hunt = zsHunt(st);
  const GL = Z3S.glL; let lit = false;
  const tw = (G, on, q, z, ph, big) => {
    G.s.visible = G.h.visible = on; if (!on) return;
    const k = Math.pow(Math.max(0, Math.sin(t * 1.25 + ph)), 14), pu = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2 + ph), b = (big || 0.22) * 1.2, at = z3v(q.x, q.y, G0 + (z == null ? q.z : z));
    G.s.position.copy(at); G.s.material.opacity = 0.3 + 0.15 * pu + 0.55 * k; G.s.scale.setScalar(b * (0.65 + 0.2 * pu + 0.55 * k));
    G.h.position.copy(at); G.h.material.opacity = 0.09 + 0.06 * pu + 0.1 * k; G.h.scale.setScalar(b * 3.4 * (0.9 + 0.15 * pu));
    GL.position.copy(at); GL.position.y += 0.3; GL.color.copy(G.s.material.color); GL.intensity = 0.14 + 0.08 * pu + 0.16 * k; lit = true;
  };
  const Gl = Z3S.gl;
  tw(Gl.table, st === 0, P.table, null, 0.3);
  tw(Gl.glass, st === 1, P.glass, null, 1.1, 0.2);
  tw(Gl.relic, hunt && !(ZS.keys & 1) && can, P.relic, null, 1.7);
  tw(Gl.bkey, hunt && !ZS.fell, P.bkey, P.bkey.z - 0.12, 2.3, 0.2);
  tw(Gl.mkey, hunt && ZS.fell && !(ZS.keys & 2) && can, P.bfloor, 0.1 + P.bfloor.z, 0.6);
  tw(Gl.ckey, hunt && !(ZS.keys & 4) && can, P.whip, null, 2.9, 0.2);
  tw(Gl.arca, (st === 5 && mine && ZS.keys === 7) || st === 6, P.arca, P.arca.z + 0.5, 0.9, 0.3);
  tw(Gl.cap, st === 7 && mine, P.cap, null, 1.4, 0.3);
  if (!lit) GL.intensity = 0;
  // the keys where they're kept, and the ring in hand
  { const M = Z3S.mkey, down = ZS.fell; M.c.visible = !down; M.g.visible = !(ZS.keys & 2) && st < 6;
    if (!down) { M.g.position.copy(z3v(P.bkey.x, P.bkey.y, G0 + P.bkey.z + 0.04)); M.g.rotation.set(0, reduceMotion ? 0 : Math.sin(t * 0.9) * 0.5, 0); }
    else { M.g.position.copy(z3v(P.bfloor.x, P.bfloor.y, G0 + P.bfloor.z + 0.01)); M.g.rotation.set(Math.PI / 2, 0, 0.7); } }
  Z3S.ckey.g.visible = !(ZS.keys & 4) && st < 6;
  Z3S.rkey.visible = st === 4 ? !(ZS.keys & 1) : st === 5 ? !(ZS.keys & 1) : false;
  const who = zsCarrierBody(), held = (o, z) => { if (who === m) { const h = m.h, ez = FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0) - (FPS.crouchEye || 0); o.position.copy(z3v(m.x + Math.sin(h) * 0.5 - Math.cos(h) * 0.28, m.y + Math.cos(h) * 0.5 + Math.sin(h) * 0.28, G0 + ez - 0.55)); o.rotation.set(0, -h, 0.3); } else { o.position.copy(z3v(who.x + Math.cos(who.h || 0) * 0.3, who.y - Math.sin(who.h || 0) * 0.3, G0 + (who.jz || 0) + z)); o.rotation.set(0, -(who.h || 0), 0.25); } };
  { const R = Z3S.ring; R.g.visible = st === 5 && !!who; if (R.g.visible) { held(R.g, 1.0); R.k.forEach((k, i) => { k.visible = !!(ZS.keys & (1 << i)); }); } }
  // the coffer's lid, and the pay: in it, in hand, on the capstan
  { const A = Z3S.arca, want = st >= 6 ? 1 : 0; A.open += (want - A.open) * Math.min(1, dt * 2.5); A.lid.rotation.x = -A.open * 1.9; }
  { const B = Z3S.bag; B.visible = st >= 6; if (st === 6) { B.position.copy(z3v(P.arca.x, P.arca.y, G0 + P.arca.z + 0.28)); B.rotation.set(0, 0, 0); } else if (st === 7) { if (who) held(B, 0.95); else B.visible = false; } else if (st === ZS_END) { B.position.copy(z3v(P.cap.x, P.cap.y, G0 + P.cap.z)); B.rotation.set(0, 0.6, 0); } }
  // the sand
  Z3S.sand.visible = st === 2 && ZS.sand > 0;
  // the saint's fire in the lanterns (and flaring at the last), and on the mastheads
  const fire = i => st >= 3 || (st === 2 && (ZS.lit & (1 << i)));
  let nf = 0;
  Z3S.lan.forEach((L, i) => {
    const on = fire(i); L.a.visible = L.b.visible = on; if (!on) return; nf++;
    const f = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 11 + i * 2.1) * Math.sin(t * 6.7 + i), fl = 1 + Math.max(0, ZS.flare) * 0.25;
    L.a.material.opacity = 0.85 * f; L.b.material.opacity = 0.32 * f; L.a.scale.setScalar(1.5 * L.s * fl * f); L.b.scale.setScalar(4.2 * L.s * fl);
  });
  Z3S.lanL.intensity = nf ? (0.5 + 0.35 * nf) * (1 + Math.max(0, ZS.flare) * 0.3) : 0;
  Z3S.mast.forEach((M, i) => { const on = st === ZS_END; M.a.visible = M.b.visible = on; if (on) { const f = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 9 + i * 1.7); M.a.material.opacity = 0.9 * f; M.b.material.opacity = 0.3 * f; } });
  // the candles on the altar
  Z3S.flames.forEach((s, i) => { s.visible = st >= 4 || (st === 3 && i < ZS.souls); if (s.visible) s.material.opacity = reduceMotion ? 0.9 : 0.75 + 0.25 * Math.sin(t * 13 + i * 2.3); });
  // the crew come in to the capstan, one by one, and fade
  const ct = ZS.cele > 0 ? 8 - ZS.cele : -1;
  Z3S.crew.forEach((s, i) => {
    const k = ct - i * 0.35; s.visible = st === ZS_END && k > 0 && ct < 8; if (!s.visible) return;
    const a = i / Z3S.crew.length * 6.2832 + t * 0.4, r = 1.6 + 3 * Math.max(0, 1 - k / 2.5), z = P.cap.z + 0.2 + (reduceMotion ? 0 : Math.sin(t * 2 + i) * 0.15);
    s.position.copy(z3v(P.cap.x + Math.cos(a) * r, P.cap.y + Math.sin(a) * r, G0 + z)); s.material.opacity = Math.min(1, k) * Math.min(1, (8 - ct) / 2) * 0.8;
  });
}

// ---------- on top of the view ----------
// the San Telmo's Piece of Eight: a struck silver cob, never quite round; the crowned shield and the 8 on its face,
// and on its back the cross with the castles and lions in its quarters
function zsDrawCoin(q, x, y, r, spin, t) {
  const c = Math.cos((spin || 0) * Math.PI * 2), back = c < 0, sx = Math.max(0.04, Math.abs(c));
  const lump = (rr, n) => { q.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.2832, k = rr * (1 + 0.045 * Math.sin(a * 3 + 0.7) + 0.03 * Math.sin(a * 5 + 2.1)); if (i) q.lineTo(Math.cos(a) * k, Math.sin(a) * k); else q.moveTo(Math.cos(a) * k, Math.sin(a) * k); } q.closePath(); };
  q.save(); q.translate(x, y); q.scale(sx, 1);
  q.fillStyle = '#5a5e64'; lump(r); q.fill();
  const gr = q.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#cfd4d8'); gr.addColorStop(1, '#868c92');
  q.fillStyle = gr; lump(r * 0.92); q.fill();
  q.strokeStyle = q.fillStyle = 'rgba(40,44,50,0.9)'; q.lineWidth = Math.max(1, r * 0.04); q.lineCap = 'round'; q.lineJoin = 'round';
  q.setLineDash([r * 0.04, r * 0.05]); q.beginPath(); q.arc(0, 0, r * 0.8, 0, 6.2832); q.stroke(); q.setLineDash([]);
  q.font = `700 ${Math.round(r * 0.18)}px "IM Fell English SC", Georgia, serif`; q.textAlign = 'center'; q.textBaseline = 'middle';
  if (!back) {
    // the shield, crowned, and the 8 beside it
    q.beginPath(); q.moveTo(-r * 0.3, -r * 0.3); q.lineTo(r * 0.3, -r * 0.3); q.lineTo(r * 0.3, r * 0.1); q.quadraticCurveTo(r * 0.3, r * 0.4, 0, r * 0.5); q.quadraticCurveTo(-r * 0.3, r * 0.4, -r * 0.3, r * 0.1); q.closePath(); q.stroke();
    q.beginPath(); q.moveTo(0, -r * 0.3); q.lineTo(0, r * 0.48); q.moveTo(-r * 0.3, r * 0.06); q.lineTo(r * 0.3, r * 0.06); q.stroke();
    q.beginPath(); q.moveTo(-r * 0.22, -r * 0.36); q.lineTo(-r * 0.24, -r * 0.5); q.lineTo(-r * 0.1, -r * 0.42); q.lineTo(0, -r * 0.56); q.lineTo(r * 0.1, -r * 0.42); q.lineTo(r * 0.24, -r * 0.5); q.lineTo(r * 0.22, -r * 0.36); q.closePath(); q.fill();
    q.font = `700 ${Math.round(r * 0.26)}px "IM Fell English SC", Georgia, serif`; q.fillText('8', r * 0.52, 0); q.fillText('S', -r * 0.52, 0);
  } else {
    // the cross, the castles and the lions
    q.lineWidth = Math.max(1, r * 0.07); q.beginPath(); q.moveTo(0, -r * 0.62); q.lineTo(0, r * 0.62); q.moveTo(-r * 0.62, 0); q.lineTo(r * 0.62, 0); q.stroke();
    q.lineWidth = Math.max(1, r * 0.035);
    for (const [sx2, sy2, castle] of [[-1, -1, true], [1, 1, true], [1, -1, false], [-1, 1, false]]) {
      const cx2 = sx2 * r * 0.3, cy2 = sy2 * r * 0.3;
      if (castle) { q.fillRect(cx2 - r * 0.1, cy2 - r * 0.06, r * 0.2, r * 0.16); for (const u of [-1, 0, 1]) q.fillRect(cx2 + u * r * 0.075 - r * 0.025, cy2 - r * 0.12, r * 0.05, r * 0.06); }
      else { q.beginPath(); q.arc(cx2, cy2 - r * 0.04, r * 0.07, 0, 6.2832); q.stroke(); q.beginPath(); q.moveTo(cx2 - r * 0.08, cy2 + r * 0.12); q.lineTo(cx2 - r * 0.04, cy2 + r * 0.02); q.lineTo(cx2 + r * 0.06, cy2 + r * 0.02); q.lineTo(cx2 + r * 0.1, cy2 + r * 0.12); q.stroke(); }
    }
    q.font = `700 ${Math.round(r * 0.11)}px "IM Fell English SC", Georgia, serif`; q.fillText('SAN TELMO · 1597', 0, r * 0.7);
  }
  if (t != null && !reduceMotion) { const k = ((t * 0.6) % 1) * 2.4 - 1.2; q.globalCompositeOperation = 'lighter'; const lg = q.createLinearGradient(k * r - r * 0.3, -r, k * r + r * 0.3, r); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(230,240,255,0.45)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = lg; lump(r * 0.92); q.fill(); q.globalCompositeOperation = 'source-over'; }
  q.restore();
}
function zsHud() {
  if (!ZS.P) return;
  const phone = FPS.touch, L = Math.max(14, FPS.safeLeft || 0), top = phone ? fpsHudTop() - 6 : 18;
  // what you carry: a small mark, top left (the keys on their ring, or the bag of pay)
  if (zsMine() && (ZS.st === 5 || ZS.st === 7) && !(FPS.me.dead > 0)) {
    fpsHudNote(top + 30); ctx.save(); ctx.translate(L + 12, top + 14); ctx.lineWidth = 2;
    if (ZS.st === 5) { ctx.strokeStyle = '#8a8e94'; ctx.beginPath(); ctx.arc(0, -8, 4, 0, 6.2832); ctx.stroke(); for (let i = 0; i < 3; i++) { const on = ZS.keys & (1 << i); ctx.strokeStyle = on ? (i === 2 ? '#d0a850' : '#a8acb2') : 'rgba(140,140,140,0.3)'; const u = (i - 1) * 6; ctx.beginPath(); ctx.moveTo(u * 0.4, -4); ctx.lineTo(u, 10); ctx.moveTo(u, 7); ctx.lineTo(u + 3, 7); ctx.stroke(); } }
    else { ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(0, 3, 8, 7, 0, 0, 6.2832); ctx.fill(); ctx.fillRect(-3, -7, 6, 4); ctx.strokeStyle = '#c8b080'; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.stroke(); }
    ctx.restore();
  }
  if (ZS.cele > 0) {
    const k = ZS.cele, a = Math.min(1, (8 - k) * 1.5, k), show = 8 - k;
    if (show > 2.2) {
      const t = g.t, r = Math.min(W, H) * (phone ? 0.13 : 0.11) * Math.min(1, (show - 2.2) * 2.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const gr = ctx.createRadialGradient(cx, H * 0.42, r * 0.5, cx, H * 0.42, r * 3); gr.addColorStop(0, 'rgba(170,210,255,0.34)'); gr.addColorStop(1, 'rgba(170,210,255,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r * 3, H * 0.42 - r * 3, r * 6, r * 6);
      if (!reduceMotion) for (let i = 0; i < 14; i++) { const an = i / 14 * 6.2832 + t * 0.7, rr = r * (1.5 + 0.3 * Math.sin(t * 3 + i)); if (Math.sin(t * 5 + i * 2.3) > 0.3) { ctx.fillStyle = '#d8ecff'; ctx.fillRect(cx + Math.cos(an) * rr - 1.5, H * 0.42 + Math.sin(an) * rr - 1.5, 3, 3); } }
      zsDrawCoin(ctx, cx, H * 0.42, r, reduceMotion ? 0 : t * 0.35, t);
      { const y0 = H * 0.42 + r + (phone ? 10 : 16), bh = phone ? 52 : 70, bw = Math.min(W * 0.92, phone ? 360 : 620); ctx.fillStyle = 'rgba(8,10,14,0.62)'; ctx.fillRect(cx - bw / 2, y0, bw, bh); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `400 ${phone ? 22 : 34}px "IM Fell English SC", serif`; ctx.fillStyle = '#e0eeff';
      ctx.fillText('The San Telmo’s Piece of Eight', cx, H * 0.42 + r + (phone ? 26 : 38), W * 0.9);
      ctx.font = `600 ${phone ? 11 : 13}px "Courier Prime", monospace`; ctx.fillStyle = 'rgba(236,228,207,0.9)';
      ctx.fillText(`A pirate token: yours to keep (${typeof ptTokens === 'function' ? ptTokens() : 1} to spend on the Keeper’s Last Light card)`, cx, H * 0.42 + r + (phone ? 48 : 68), W * 0.9);
      ctx.restore();
    }
  }
}
