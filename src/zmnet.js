// The Lighthouse, played together: a lobby, and up to four in one night.
//
// Someone hosts a night from the Lighthouse's card; the others here see it listed and join it. Nothing starts until
// the host presses Start, with whoever has joined by then. Like The Drowned Reach played together (warnet.js), it
// all goes through the room the crews sail in (net.js), on its own key (`zm`) in each player's presence, which the
// server relays at full rate between the players of one night (and only a short summary to everyone else, for the
// lobby list).
// The host's browser runs the night: the rounds, the drowned and their way about the station, the windows and their
// boards, the doors, the chest and the salvage. A few times a second it sends what changed:
//   h   the round, its phase and clock, how many are still to come, Double Salvage and the Black Spot
//   z   every one of the drowned: where, which way, what they're doing, a swing in progress, how they died
//   b   each window's boards     dm  which doors are open     bx  the chest     dr  salvage lying about
//   cr  the points, kills and headshots it has credited to each of the others
//   ev  things that happen once: salvage taken, someone got up, a line for the feed
// Everyone moves and shoots for themselves, and sends where they are (`p`), their shots (`sh`, for the others to see
// and hear), their hits on the drowned (`hq`, which the host applies and credits), and what they've asked of the
// night (`q`: open a door, a go at the chest, take what it offers, a board back on a window, get someone up). Points
// are each player's own: what the host credits arrives as points, and buying spends them (a door or the chest
// already taken by someone else gives them back).
// Going down together: three-quarters of a minute on the floor (ZM_DOWN), still firing a pepperbox, where a friend
// holding Use beside you gets you up; bleed out and you're back next round with a pepperbox. Each player's presence
// carries their own clock on the floor (`dn`) and whom they're getting up and how far along (`rv`), so the one down,
// the one helping and everyone else see the same. The night is over when nobody is left standing.

const ZN = { code: null, at: 0, doneG: null, msg: '', g: null, sendT: 0, hseq: 0, seq: 0, q: [], hq: [], hits: new Map(), shots: [], shotSeq: 0,
  lastQ: {}, lastH: {}, lastShot: {}, seenT: {}, ev: [], eseq: 0, evSeen: 0, lastHseq: -1, hostT: 0, creditSeen: [0, 0, 0], lobT: 0 };
const ZN_MAX = 4;
const znClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯<>&"]/g, '').trim().slice(0, n);
const zb36 = v => Math.round(v || 0).toString(36);
const zp36 = s => parseInt(s, 36) || 0;

// ---------- the lobby ----------
function znOnline() { return !!(typeof NET !== 'undefined' && NET.room && NET.status === 'ready'); }
function znNick() { return znClean(($('zmNick') && $('zmNick').value) || '', 16) || (NET.nick ? znClean(NET.nick, 16) : '') || 'Keeper ' + String(NET.sid || '').slice(0, 3).toUpperCase(); }
function znOf(p) { const z = p && p.presence && p.presence.zm; return z && typeof z === 'object' && typeof z.room === 'string' && typeof z.sid === 'string' ? z : null; }
function znBase() { return { room: ZN.code, sid: NET.sid, nick: znNick(), at: ZN.at }; }
function znPeers(code) {
  const out = NET.peers.filter(p => { const z = znOf(p); return z && z.room === code && fresh(p) && !(p.isMe && p.sameTab); });
  if (ZN.code === code) out.push({ isMe: true, sameTab: true, presence: { zm: znBase() } });
  const seen = new Set();
  return out.filter(p => { const s = znOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; })
    .sort((a, b) => (znOf(a).at || 0) - (znOf(b).at || 0) || (znOf(a).sid < znOf(b).sid ? -1 : 1));
}
function znMembers() { return ZN.code ? znPeers(ZN.code).slice(0, ZN_MAX) : []; }
function znAmHost() { const m = znMembers(); return !!m.length && m[0].isMe && m[0].sameTab; }
function znSend(z) { if (NET.room) NET.room.presence({ zm: z }).catch(() => {}); }
function znSendLobby() {
  if (!ZN.code) return;
  const z = znBase();
  if (znAmHost()) z.lob = { n: znMembers().length };
  znSend(z);
}
function znHost() {
  if (!znOnline() || FPS.on) return;
  ZN.code = 'z' + Math.random().toString(36).slice(2, 8); ZN.at = Date.now(); ZN.msg = '';
  znSendLobby(); znRender();
}
function znJoin(code) {
  if (!znOnline() || !code || FPS.on) return;
  if (znPeers(code).length >= ZN_MAX) { ZN.msg = 'That night is full (four players).'; znRender(); return; }
  ZN.code = code; ZN.at = Date.now(); ZN.msg = '';
  znSendLobby(); znRender();
}
function znLeave() {
  ZN.code = null; ZN.g = null;
  if (NET.room) NET.room.presence({ zm: null }).catch(() => {});
  znRender();
}
// the nights being hosted here: each room's host, and whether it's begun
function znOpenNights() {
  const rooms = new Map();
  for (const p of NET.peers) {
    const z = znOf(p); if (!z || !fresh(p) || (p.isMe && p.sameTab)) continue;
    if (!rooms.has(z.room)) rooms.set(z.room, []);
    rooms.get(z.room).push(p);
  }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === ZN.code) continue;
    list.sort((a, b) => (znOf(a).at || 0) - (znOf(b).at || 0));
    const h = znOf(list[0]);
    out.push({ code, host: znClean(h.nick, 16) || 'Someone', n: list.length, started: !!(h.st && h.st.g) });
  }
  return out;
}
function znRender() {
  if (!$('zmMp')) return;
  const on = znOnline();
  $('zmMpNote').textContent = on ? 'Up to four in one night. One of you hosts; the others join, and the host starts the night when everyone’s in.' : (NET.status === 'connecting' ? 'Looking for other players…' : (NET.offReason || 'Playing together isn’t available here.'));
  $('zmMpOpen').hidden = !on || !!ZN.code;
  $('zmLobby').hidden = !ZN.code;
  if (!on) return;
  if (!ZN.code) {
    const nights = znOpenNights(), el = $('zmLobbies'), key = JSON.stringify(nights) + ZN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key;
    el.textContent = '';
    if (ZN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = ZN.msg; el.append(p); }
    if (!nights.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No one is hosting a night right now. Host one, and send the people you want to play with to this page.'; el.append(p); return; }
    for (const n of nights) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `${n.host}’s night`;
      const sm = document.createElement('small'); sm.textContent = n.started ? 'under way' : `${n.n}/${ZN_MAX} players · tap to join`;
      b.append(nm, sm);
      b.disabled = n.started || n.n >= ZN_MAX;
      b.addEventListener('click', () => znJoin(n.code));
      el.append(b);
    }
    return;
  }
  const m = znMembers(), host = znAmHost(), hz = m.length ? znOf(m[0]) : null;
  const key = m.map(p => znOf(p).sid + znOf(p).nick).join('|') + host + ZN.msg;
  $('zmMpStart').hidden = !host;
  if ($('zmLobby').dataset.k === key) return; $('zmLobby').dataset.k = key;
  $('zmLobbyHead').textContent = host ? 'Your night' : `${znClean(hz && hz.nick, 16) || 'Someone'}’s night`;
  const ol = $('zmLobbyList'); ol.textContent = '';
  m.forEach((p, k) => {
    const li = document.createElement('li'), z = znOf(p);
    li.textContent = (znClean(z.nick, 16) || 'A keeper') + (p.isMe && p.sameTab ? ' (you)' : '') + (k === 0 ? ' · hosting' : '');
    if (p.isMe && p.sameTab) li.className = 'me';
    ol.append(li);
  });
  $('zmLobbyMsg').textContent = ZN.msg || (host
    ? (m.length > 1 ? `${m.length} of ${ZN_MAX} here. Start the night when everyone’s in.` : 'Waiting for others to join. You can start alone, too, whenever you like.')
    : 'Waiting for the host to start the night.');
}

// the host starts the night, with everyone in the lobby
function znStart() {
  if (!znAmHost() || FPS.on) return;
  const m = znMembers();
  const st = { g: Math.random().toString(36).slice(2, 9), hum: m.map(p => [znOf(p).sid, znClean(znOf(p).nick, 16) || 'A keeper']) };
  znBegin(st, 'host');
}
function znBegin(st, role) {
  Object.assign(ZN, { g: st.g, st, doneG: st.g, sendT: 0, hseq: 0, seq: 0, q: [], hq: [], shots: [], shotSeq: 0, lastQ: {}, lastH: {}, lastShot: {}, seenT: {}, ev: [], eseq: 0, evSeen: 0, lastHseq: -1, hostT: performance.now(), creditSeen: [0, 0, 0] });
  ZN.hits.clear();
  zmStart({ net: role, hum: st.hum });
  for (const [sid] of st.hum) ZN.seenT[sid] = performance.now();
}
// every change in the room: keep the lobby current, and start when the host does
function zmNetPeers() {
  if (FPS.on && FPS.zm && ZM.net) return;
  if (ZN.code) {
    const m = znMembers();
    if (!m.some(p => p.isMe && p.sameTab)) { ZN.msg = 'That night filled up before you got in.'; znLeave(); return; }
    const h = m[0], hz = h ? znOf(h) : null;
    if (h && !(h.isMe && h.sameTab) && hz.st && typeof hz.st.g === 'string' && hz.st.g !== ZN.doneG && Array.isArray(hz.st.hum) && !FPS.on) {
      if (hz.st.hum.some(x => Array.isArray(x) && x[0] === NET.sid)) {
        const st = { g: hz.st.g, hum: hz.st.hum.slice(0, ZN_MAX).filter(x => Array.isArray(x)).map(x => [String(x[0]), znClean(x[1], 16) || 'A keeper']) };
        znBegin(st, 'client'); return;
      }
      ZN.doneG = hz.st.g; ZN.msg = 'The night started without you. Host your own, or wait for the next.';
    }
    if (znAmHost() && performance.now() - ZN.lobT > 3000) { ZN.lobT = performance.now(); znSendLobby(); }
  }
  znRender();
}
// a night over (or left): back to the lobby on the title card, still in the same room
function zmnBackToLobby() {
  setTimeout(() => {
    if (ZN.code) { znSendLobby(); const c = $('zmTitle'); if (c) c.scrollIntoView({ block: 'start' }); }
    znRender();
  }, 50);
}
function zmnStop() {
  for (const r of FPS.remote.values()) if (typeof FBR !== 'undefined' && FBR.has(r.id)) { fbDispose(FBR.get(r.id)); FBR.delete(r.id); }
  FPS.remote.clear();
  ZN.g = null;
  if (ZN.code) znSendLobby();
}

// ---------- during the night: everyone ----------
// my own state: where I am and what I'm doing
function znMe() {
  const m = FPS.me, CX = FPSC.CX, CY = FPSC.CY;
  const fl = (m.lan ? 1 : 0) | (m.walk ? 2 : 0) | (ZM.downT > 0 ? 4 : 0) | (ZM.ghost ? 8 : 0) | ((FPS.meSlashT || 0) > 0 ? 16 : 0) | (FPS.beamT > 0 ? 32 : 0);
  return [Math.round((m.x - CX) * 100), Math.round((m.y - CY) * 100), Math.round((m.jz || 0) * 100), Math.round(m.h * 1000), Math.round(m.p * 1000), fpsW().code, fl];
}
function znPresence() {
  const z = znBase();
  z.g = ZN.g; z.p = znMe(); z.pt = ZM.pts;
  z.c = fpsColours(); z.o = typeof ocEquippedId === 'function' ? ocEquippedId() || '' : '';
  if (ZN.shots.length) z.sh = ZN.shots.slice(-4);
  // down: how long I've left on the floor (tenths); getting someone up: who, and how far along (hundredths)
  if (ZM.downT > 0) z.dn = Math.ceil(ZM.downT * 10);
  if (ZM.revOf && ZM.revT > 0) z.rv = [ZM.revOf, Math.round(ZM.revT / ZM_DOWN.REV * 100)];
  // my health and the most I can have (Stout Heart), for the bar over my head and for anyone watching me
  z.hp = FPS.me.dead > 0 || ZM.downT > 0 ? 0 : Math.max(0, Math.ceil(FPS.me.hp)); z.hm = ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
  return z;
}
// my shots, for the others to see and hear
function zmnShot(code, h, p) {
  if (!ZM.net) return;
  ZN.shots.push([++ZN.shotSeq, code, Math.round(h * 1000), Math.round(p * 1000)]);
  if (ZN.shots.length > 6) ZN.shots.shift();
}
// someone else's shot: a streak to what it hits (as I see it) and its report, and nothing more
function znShotFx(r, s) {
  const code = String(s[1]), w = fpsWOf(code), h = (+s[2] || 0) / 1000, p = (+s[3] || 0) / 1000, m = FPS.me;
  const x = r.x, y = r.y, z = FPSC.GROUND + FPSC.EYE + (r.jz || 0), d = Math.hypot(x - m.x, y - m.y), pan = angDiff(bearingOf(x - m.x, y - m.y), m.h);
  r.flashT = 0.12;
  if (w.melee) { fpsSwishSound(d); r.slashT = 0.3; return; }
  if (w.beam) { if (d < 40 && Math.random() < 0.4) zmSound('beam'); }
  else fpsWeaponSound(code, d, pan);
  if (w.speed) return;
  const ray = fpsRay(x, y, z, h, p, r.id, ZM.z.filter(q => !q.dead), w.range);
  FPS.tracers.push({ a: [x + Math.sin(h) * 0.6, y + Math.cos(h) * 0.6, z - 0.25], b: [ray.x, ray.y, ray.z], t: w.beam ? 0.12 : 0.08, k: code });
}
// the others, as I hear them: their figures (FPS.remote, as on the islands), and their shots
function znReadPlayers(dt) {
  const now = performance.now(), CX = FPSC.CX, CY = FPSC.CY, k = Math.min(1, dt * 12), seen = new Set();
  for (const p of NET.peers) {
    const z = znOf(p);
    if (!z || z.room !== ZN.code || z.g !== ZN.g || z.sid === NET.sid || !ZM.hum.some(h => h[0] === z.sid) || !Array.isArray(z.p)) continue;
    seen.add(z.sid); ZN.seenT[z.sid] = now;
    let r = FPS.remote.get(z.sid);
    const a = z.p.map(v => typeof v === 'number' && isFinite(v) ? v : 0);
    if (!r) { r = { id: z.sid, x: CX + a[0] / 100, y: CY + a[1] / 100, h: a[3] / 1000, hitT: 0, flashT: 0, kb: {}, d: 0 }; FPS.remote.set(z.sid, r); }
    r.n = (ZM.hum.find(h => h[0] === z.sid) || [])[1] || 'A keeper';
    r.tx = CX + a[0] / 100; r.ty = CY + a[1] / 100; r.tjz = a[2] / 100; r.th = a[3] / 1000; r.p = a[4] / 1000;
    r.w = typeof z.p[5] === 'string' ? z.p[5].slice(0, 1) : 'p';
    const fl = a[6] | 0;
    r.lan = !!(fl & 1); r.walk = !!(fl & 2); r.down = !!(fl & 4); r.dead = !!(fl & 8); r.beam = !!(fl & 32);
    r.c = Array.isArray(z.c) ? z.c.slice(0, 4).map(c => typeof c === 'string' ? c.slice(0, 9) : '#3a2a1e') : null;
    r.o = typeof z.o === 'string' ? z.o.slice(0, 24) : '';
    r.pts = Math.max(0, z.pt | 0);
    r.dn = r.down ? clamp(+z.dn || 0, 0, ZM_DOWN.T * 10) / 10 : 0;
    r.rv = Array.isArray(z.rv) && typeof z.rv[0] === 'string' ? [z.rv[0], clamp(+z.rv[1] || 0, 0, 100) / 100] : null;
    r.hm = clamp(z.hm | 0 || ZMC.HP, 1, 12); r.hp = z.hp == null ? null : clamp(+z.hp || 0, 0, r.hm);
    r.left = false;
    if (Array.isArray(z.sh)) {
      const last = ZN.lastShot[z.sid] || 0;
      for (const s of z.sh) if (Array.isArray(s) && s[0] > last) { ZN.lastShot[z.sid] = s[0]; znShotFx(r, s); }
    }
  }
  for (const r of FPS.remote.values()) {
    if (r.tx == null) continue;
    r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.h += angDiff(r.th, r.h) * k;
    r.jz = (r.jz || 0) + ((r.tjz - (r.down ? 0.75 : 0)) - (r.jz || 0)) * Math.min(1, k * 1.6);
    if (r.flashT > 0) r.flashT -= dt; if (r.slashT > 0) r.slashT -= dt;
    // not heard from for a long while: gone
    if (!seen.has(r.id) && now - (ZN.seenT[r.id] || 0) > 15000 && !r.left) { r.left = true; r.dead = true; fpsFeed(`${r.n} has left the night.`); }
  }
  return seen;
}

// ---------- the host ----------
function zmnHost(dt) {
  znReadPlayers(dt);
  for (const p of NET.peers) {
    const z = znOf(p);
    if (!z || z.room !== ZN.code || z.g !== ZN.g || z.sid === NET.sid || !ZM.hum.some(h => h[0] === z.sid)) continue;
    // their hits on the drowned, judged here and credited to them
    if (Array.isArray(z.hq)) {
      const last = ZN.lastH[z.sid] || 0;
      for (const o of z.hq) {
        if (!Array.isArray(o) || !(o[0] > last)) continue;
        ZN.lastH[z.sid] = Math.max(ZN.lastH[z.sid] || 0, o[0]);
        const d = ZM.z.find(q => q.zn === o[1]);
        if (d && !d.dead) zmHurt(d, clamp(+o[2] || 0, 0, 1e4) / 100, !!o[3], typeof o[4] === 'string' ? o[4].slice(0, 1) : 'p', z.sid, o[5] === 'b' ? 'burn' : undefined);
      }
    }
    // what they've asked of the night
    if (Array.isArray(z.q)) {
      const last = ZN.lastQ[z.sid] || 0;
      for (const o of z.q) {
        if (!Array.isArray(o) || !(o[0] > last)) continue;
        ZN.lastQ[z.sid] = Math.max(ZN.lastQ[z.sid] || 0, o[0]);
        znRequestFrom(z.sid, String(o[1]), o[2]);
      }
    }
  }
  ZN.sendT -= dt;
  if (ZN.sendT <= 0) { ZN.sendT = 0.1; znHostSend(); }
}
function znRequestFrom(sid, k, a) {
  const credit = n => zmPoints(n, true, sid);
  if (k === 'door') { const d = ZM.doors[a | 0]; if (!d) return; if (d.open) credit(d.cost); else zmOpenDoor(d); return; }
  if (k === 'box') { zmBoxSpin(sid, String(a || '').split(',').filter(id => FPSW[id])); return; }
  if (k === 'take') { if (ZM.box.st === 'offer' && ZM.box.owner === sid) { ZM.box.st = 'idle'; ZM.box.t = 0; } return; }
  if (k === 'board') { const w = ZM.windows[a | 0]; if (w && w.boards < 6 && !ZM.z.some(z => z.win === w && z.st === 'climb')) { w.boards++; zmBoardPay(sid); } return; }
  if (k === 'rev') { zmnRevive(String(a), sid); return; }
  if (k === 'pst') { if (typeof zmpStatusFrom === 'function') zmpStatusFrom(sid, a); return; }   // [pap] what a reforged weapon did to them
  if (k === 'egg') { if (typeof zeRequest === 'function') zeRequest(sid, a); return; }   // [egg hook] src/zmegg.js
}
// someone (by) gets someone (sid) up: everyone's told who got whom up (and if it's me, up I get)
function zmnRevive(sid, by) {
  if (ZM.net === 'client') { zmnRequest('rev', sid); return; }
  by = by || FPS.me.id;
  zmnEvent('rev', sid, by);
  znRevived(sid, by);
}
function znRevived(sid, by) {
  const nick = s => s === FPS.me.id ? 'You' : (ZM.hum.find(h => h[0] === s) || [])[1] || 'Someone';
  if (sid === FPS.me.id) zmGetUp(by !== sid ? nick(by) : null);
  else fpsFeed(`${nick(by)} got ${nick(sid)} up.`);
}
function zmnEvent(k, a, b) { ZN.ev.push(b == null ? [++ZN.eseq, k, a] : [++ZN.eseq, k, a, b]); if (ZN.ev.length > 8) ZN.ev.shift(); }
const ZN_ST = { out: 0, tear: 1, climb: 2, in: 3 }, ZN_STN = ['out', 'tear', 'climb', 'in'], ZN_BOXST = ['idle', 'spin', 'offer', 'gull', 'gone'];
const ZN_KIND = ['walk', 'jog', 'run'], ZN_PH = { pre: 0, round: 1, break: 2 };
function znHostSend() {
  const z = znPresence(), CX = FPSC.CX, CY = FPSC.CY, TAU = Math.PI * 2;
  z.st = ZN.st;
  z.h = [++ZN.hseq, ZM.round, ZM.over ? 3 : ZN_PH[ZM.phase] | 0, Math.round(ZM.t * 10), ZM.left, Math.round(Math.max(0, ZM.double) * 10), Math.round(Math.max(0, ZM.insta) * 10)];
  // the drowned: id.x.y.jz.h.state.kind.swing.flags.window.seed.scorch, each in base 36
  z.z = ZM.z.filter(q => !q.gone).slice(0, 40).map(q => [q.zn, (q.x - CX) * 10 + 9000, (q.y - CY) * 10 + 9000, (q.jz || 0) * 10, (((q.h % TAU) + TAU) % TAU) * 100, ZN_ST[q.st] | 0, ZN_KIND.indexOf(q.kind), q.swing < 0 ? 0 : q.swing * 100 + 1,
    (q.dead ? 1 : 0) | (q.burn ? 2 : 0) | (q.head ? 4 : 0) | (q.walk ? 8 : 0) | (q.mark > 0 ? 16 : 0), q.win ? q.win.id : 0, q.seed % 1296, (q.scorch || 0) * 9].map(zb36).join('.')).join('~');
  z.b = ZM.windows.map(w => w.boards).join('');
  z.dm = ZM.doors.reduce((s, d, i) => s | (d.open ? 1 << i : 0), 0);
  const B = ZM.box;
  z.bx = [B.at, ZN_BOXST.indexOf(B.st), Math.round(B.t * 10), B.item ? ZM_BOXW.findIndex(a => a[0] === B.item) : -1, B.owner || ''];
  z.dr = ZM.drops.map(d => [d.id, d.k, Math.round((d.x - CX) * 10), Math.round((d.y - CY) * 10), Math.round(d.z * 10), Math.round(d.t)]);
  z.cr = ZM.credit;
  z.ev = ZN.ev;
  if (typeof zbHostSend === 'function') zbHostSend(z);   // [boss] the Diver's strength and his blow (src/zmboss.js)
  if (typeof zeHostSend === 'function') zeHostSend(z);   // [egg hook] src/zmegg.js
  znSend(z);
}

// ---------- joined: what the host says ----------
function zmnClient(dt) {
  const seen = znReadPlayers(dt), host = ZM.hum[0] && ZM.hum[0][0];
  let hz = null;
  for (const p of NET.peers) { const z = znOf(p); if (z && z.room === ZN.code && z.g === ZN.g && z.sid === host) { hz = z; break; } }
  if (hz && Array.isArray(hz.h) && hz.h[0] !== ZN.lastHseq) { ZN.lastHseq = hz.h[0]; ZN.hostT = performance.now(); znApply(hz); }
  if (!ZM.over && performance.now() - ZN.hostT > 12000) { fpsFeed('The host has gone, and the night with them.'); zmEnd(); }
  // the drowned between the host's word: slide on towards where they were last said to be
  const k = Math.min(1, dt * 10);
  for (const z of ZM.z) {
    if (z.hitT > 0) z.hitT -= dt;
    z.t += dt;
    if (z.dead) { z.deadT = (z.deadT || 0) + dt; continue; }
    if (z.tx == null) continue;
    z.x += (z.tx - z.x) * k; z.y += (z.ty - z.y) * k; z.jz += (z.tjz - z.jz) * k; z.h += angDiff(z.th, z.h) * k;
  }
  for (const z of ZM.z) if (z.dead && z.deadT > (z.burn ? 1.3 : 2.4) && z.mdl) zmFreeModel(z);
  // the chest's weapons turning over, here as there
  const B = ZM.box; B.t += dt;
  if (B.st === 'spin') { B.cyc += dt * (14 - B.t * 3); if (B.cyc > 1) { B.cyc = 0; const ids = ZM_BOXW.map(a => a[0]); B.show = ids[(ids.indexOf(B.show) + 1 + ((Math.random() * 3) | 0)) % ids.length]; zmSound('tick'); } }
  for (const d of ZM.drops) d.ph += dt;
  if (ZM.double > 0) ZM.double -= dt; if (ZM.insta > 0) ZM.insta -= dt;
  ZN.sendT -= dt;
  if (ZN.sendT <= 0) { ZN.sendT = 0.1; znClientSend(); }
}
function znClientSend() {
  const z = znPresence();
  if (ZN.q.length) z.q = ZN.q.slice(-10);
  // my hits since the last send, one entry per one of them, kept for a few sends in case one goes astray
  if (ZN.hits.size) { for (const [zn, h] of ZN.hits) ZN.hq.push([++ZN.seq, zn, Math.round(h.dmg * 100), h.head ? 1 : 0, h.code, h.how === 'burn' ? 'b' : '']); ZN.hits.clear(); }
  if (ZN.hq.length > 30) ZN.hq.splice(0, ZN.hq.length - 30);
  if (ZN.hq.length) z.hq = ZN.hq;
  znSend(z);
}
function zmnRequest(k, a) { ZN.q.push([++ZN.seq, k, a]); if (ZN.q.length > 10) ZN.q.shift(); }
function zmnHit(d, dmg, head, code, how) {
  const h = ZN.hits.get(d.zn) || { dmg: 0, head: false, code, how };
  h.dmg += dmg; h.head = h.head || !!head; h.code = code; if (how) h.how = how;
  ZN.hits.set(d.zn, h);
}
function znApply(hz) {
  const CX = FPSC.CX, CY = FPSC.CY, m = FPS.me;
  const H = hz.h.map(v => +v || 0);
  // the round and its phase
  const round = H[1] | 0, ph = H[2] | 0;
  if (round > ZM.round) {
    ZM.round = round; ZM.boardPts = 0; ZM.banner = { text: 'Round ' + round, t: 4 }; zmSound('round'); zmRoundBegins();
    if (round > 1) fpsFeed(`Round ${round}.`);
  }
  const phase = ph === 3 ? 'over' : ['pre', 'round', 'break'][ph] || 'round';
  if (phase === 'break' && ZM.phase === 'round') { zmSound('end'); ZM.banner = { text: `Round ${ZM.round} held`, t: 3.5, small: true }; zmRoundHeld(); }
  if (phase === 'over') zmEnd(); else ZM.phase = phase;
  ZM.t = H[3] / 10; ZM.left = H[4]; ZM.double = H[5] / 10; ZM.insta = H[6] / 10;
  // the doors
  const dm = hz.dm | 0;
  ZM.doors.forEach((d, i) => { if ((dm & (1 << i)) && !d.open) zmOpenDoor(d); });
  // the windows' boards: any gone are torn off
  if (typeof hz.b === 'string') ZM.windows.forEach((w, i) => {
    const n = clamp(+hz.b[i] || 0, 0, 6);
    if (n < w.boards) { for (let j = n; j < w.boards; j++) w.fall.push({ i: j, t: 0 }); zmSound('tear', Math.hypot(w.x - m.x, w.y - m.y)); }
    w.boards = n;
  });
  // the chest
  if (Array.isArray(hz.bx)) {
    const B = ZM.box, at = clamp(hz.bx[0] | 0, 0, ZM.spawns.length - 1), st = ZN_BOXST[hz.bx[1] | 0] || 'idle', item = ZM_BOXW[hz.bx[3] | 0];
    if (st !== B.st) {
      if (st === 'spin') { B.cyc = 0; zmSound('open'); }
      if (st === 'offer') zmSound('offer');
      if (st === 'gull') zmSound('gull');
    }
    B.at = at; B.st = st; B.t = (+hz.bx[2] || 0) / 10; B.owner = typeof hz.bx[4] === 'string' ? hz.bx[4] : null;
    B.item = item ? item[0] : null;
    if (st === 'offer' || st === 'gull') B.show = B.item;
  }
  // the drowned
  const list = typeof hz.z === 'string' && hz.z ? hz.z.split('~') : [], have = new Set();
  for (const s of list) {
    const a = s.split('.').map(zp36);
    if (a.length < 12) continue;
    const zn = a[0]; have.add(zn);
    let z = ZM.z.find(q => q.zn === zn);
    const x = CX + (a[1] - 9000) / 10, y = CY + (a[2] - 9000) / 10, jz = a[3] / 10, h = a[4] / 100, st = ZN_STN[a[5]] || 'in', kind = ZN_KIND[a[6]] || 'walk';
    if (!z) {
      z = { drowned: true, zm: true, zn, id: 'z' + zn.toString(36), n: 'a drowned man', x, y, jz, h, st, kind, sp: kind === 'run' ? 5.2 : kind === 'jog' ? 3.4 : 1.7,
        t: 0, ph: Math.random() * 6, hitT: 0, swing: -1, seed: a[10], win: ZM.windows[a[9]] || null, dead: 0, hist: [] };
      ZM.z.push(z);
    }
    if (st !== z.st) { z.t = 0; z.st = st; }
    z.tx = x; z.ty = y; z.tjz = jz; z.th = h;
    const sw = a[7] ? (a[7] - 1) / 100 : -1;
    // a swing coming down: if I'm in reach, it's me it hits (the host only judges its own player)
    const was = z.swing;
    if (sw >= 0.28 && (was < 0.28 || was > sw) && !z.dead) {
      const reach = st === 'tear' ? 1.6 : 1.55;
      if (Math.hypot(m.x - x, m.y - y) < reach && Math.abs((m.jz || 0) - jz) < 1.2 && !(m.dead > 0) && !(m.protect > 0) && !zmIsDown()) { fpsHurt(1, null, null); zmSound('hit'); }
    }
    z.swing = sw;
    const fl = a[8];
    z.walk = !!(fl & 8); z.scorch = a[11] / 9;
    if (fl & 16) z.mark = Math.max(z.mark || 0, 0.3);   // [pap] lit by someone's Leading Light
    if ((fl & 1) && !z.dead) { z.dead = 1; z.deadT = 0; z.burn = !!(fl & 2); z.head = !!(fl & 4); zmKillFx(z); }
  }
  for (const z of ZM.z) if (!have.has(z.zn) && !(z.dead && z.deadT < 2.4)) { if (z.mdl) zmFreeModel(z); z.remove = true; }
  ZM.z = ZM.z.filter(z => !z.remove); FPS.drowned = ZM.z;
  if (typeof zbApply === 'function') zbApply(hz);   // [boss] the Diver, and his blows landing on me
  // salvage
  if (Array.isArray(hz.dr)) {
    const keep = [];
    for (const r of hz.dr) {
      if (!Array.isArray(r) || !ZM_DROPS[r[1]]) continue;
      let d = ZM.drops.find(q => q.id === r[0]);
      if (!d) { d = { id: r[0], k: r[1], ph: Math.random() * 6 }; zmSound('drop'); }
      d.x = CX + r[2] / 10; d.y = CY + r[3] / 10; d.z = r[4] / 10; d.t = r[5];
      keep.push(d);
    }
    ZM.drops = keep;
  }
  // my points, kills and headshots, as credited by the host
  const c = hz.cr && Array.isArray(hz.cr[NET.sid]) ? hz.cr[NET.sid].map(v => Math.max(0, +v || 0)) : null;
  if (c) {
    const dp = c[0] - ZN.creditSeen[0], dk = c[1] - ZN.creditSeen[1];
    if (dp > 0) zmPoints(dp, true);
    for (let i = 0; i < dk; i++) zmEarnKill();
    ZM.kills = c[1]; ZM.heads = c[2];
    ZN.creditSeen = c;
  }
  if (typeof zeApply === 'function') zeApply(hz);   // [egg hook] src/zmegg.js
  // things that happen once
  if (Array.isArray(hz.ev)) for (const e of hz.ev) {
    if (!Array.isArray(e) || !(e[0] > ZN.evSeen)) continue;
    ZN.evSeen = e[0];
    if (e[1] === 'take' && ZM_DROPS[e[2]]) zmTake(e[2], true);
    else if (e[1] === 'rev' && typeof e[2] === 'string') znRevived(e[2], typeof e[3] === 'string' ? e[3] : '');
    else if (e[1] === 'feed') fpsFeed(znClean(e[2], 120));
  }
}

// ---------- buttons ----------
{
  $('zmMpHost').addEventListener('click', znHost);
  $('zmMpLeave').addEventListener('click', znLeave);
  $('zmMpStart').addEventListener('click', znStart);
  setInterval(() => { if (!FPS.on && !$('zmTitle').closest('[hidden]')) { znRender(); if (ZN.code) znSendLobby(); } }, 1500);
  addEventListener('pagehide', () => { if (ZN.code && NET.room) NET.room.presence({ zm: null }).catch(() => {}); });
}
