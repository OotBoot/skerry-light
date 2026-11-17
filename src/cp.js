'use strict';
// The Chronicle of the Light: the tenth game, a campaign. The Skerry Compendium's timeline (src/lore.js, 'timeline'),
// played through from the first fire on Lantern Rock to the war for the Drowned Reach, one mission for each of its
// key moments, alone or up to four together. Each mission opens and closes with a cinematic (src/cpcine.js), and
// plays its key moments as cutscenes on the way.
//
// How it's built. Like Fog Run and Freebooters' Sea, it's a raid (src/raid.js): its own map, ZM_MAPS.campaign (cp:
// true), its own entry in RAIDS (kept off the raid card's picker: RAIDS.campaign.own), the callings (src/rclass.js),
// going down and getting up, and playing together through the Lighthouse's lobby (src/zmnet.js, its own mode 'cp',
// prefix cp, card cpTitle). The host's browser runs it. What's its own:
//  - The missions, CP_MISSIONS (in order; each registered by its own file, src/cpm01.js to src/cpm14.js, with
//    cpMission). A mission is a run of raid stages: its own, registered with cpStage(key, stage) as
//    RAID_STAGES['cp_' + key], and any of the other raids' (e.g. 'gwsail', 'gwhold', 'gwcapt', 'descent', 'bridge',
//    'fort'). Once the raid begins, RAID_ORDER is the mission's stages. The mission picked goes out with the start
//    (st.cm: its id; st.cf: the stage to start at, for a checkpoint), so every screen lays out the same.
//  - The story's state, CP (below): which mission (CP.mid), the objective shown at the top (CP.obj), lines said
//    (CP.ev, events in the host's word like Freebooters' Sea's), and the cinematic playing (src/cpcine.js).
//  - Progress, kept on this browser (localStorage 'skerry-campaign', and in the save: crates.js saveData 'cp'), and
//    always merged, never replaced (cpMerge): each mission's times finished and best time. Missions open in order:
//    the first always, each next one once the one before is done. Together, the host's open missions are the ones
//    on offer, and everyone who sees a mission through has it marked done on their own browser.
//  - Checkpoints: lose a mission and you can try again from the part you were on (solo: straight away; together the
//    host's lobby starts the next one from it).
//
// The hook API, for the missions' own files:
//  - cpMission(def): a mission. def: { id ('m01'), act (1 to 5), n (its name), when (the date, as the timeline gives
//    it), where, blurb (a line or two for the card), stages: [RAID_STAGES keys, in order], intro / outro (cinematic
//    ids: played as it begins, and once its last stage is won), cut: { i: cinematic id } (played as stage i begins,
//    after it's laid out), after: { i: cinematic id } (played once stage i is done, before the next is laid out),
//    music: { default: key, ... } (see cpMusic), lives: n (together, extra lives each, as Fog Run's: default 1),
//    begin() / stop() (the raid beginning and ending: anything of yours set up or put back, on every screen) }.
//  - cpStage(key, stage): a stage of the campaign's own (src/raid.js hooks), as RAID_STAGES['cp_' + key]. Its
//    map can lay itself out from any FPI_GEN island (map.isle) or as the raid's own cave (left out).
//  - cpCast(k, { n, c }): someone who speaks (a name and the colour it's shown in). CP_CAST has the timeline's people.
//  - cpSay(who, text, vo) (hosting or alone): a line said, shown on everyone's screen as a subtitle and, where its
//    recording has been made (src/sfxbank.js: 'vo_' + vo), heard. vo is the line's id: 'cp_m01_03' and so on, the
//    names the sound thread records them under (see /campaign/sound-notes.md in the project files).
//  - cpObjective(text) (hosting or alone): the objective shown at the top of everyone's screen ('' to clear).
//  - cpCine(id, then) (hosting or alone): play a cinematic on every screen (src/cpcine.js); then() runs on the host
//    when it's over (or skipped). cpCineOn() is true on any screen while one plays: nothing moves, nobody is hurt.
//  - cpDone() (hosting or alone): this stage is done. On to the next (through its 'after' cinematic), or, past the
//    last, the mission is won (through its outro). raidNextStage() and raidWin() go the same way here.
//  - cpFail(why) (hosting or alone): the mission is lost (the over card says why).
//  - cpAsk(k, a): a joined player asks the host something of the campaign (cpQ(sid, k, a) on the host): k begins 'cp'.
//  - cpMusic(): the music key for now (src/raidmusic.js rmWant asks it first): the cinematic's own, else the stage's
//    music(), else the mission's music.default. A key whose recording isn't made yet falls back (CP_MUSIC_FALL) to
//    one that is, so there's always something playing.
//  - cpDebug(mid, stage): straight into a mission alone (the calling picked for you), at a stage, for tests.
// Hooks in shared files are marked [campaign]: src/raid.js (raidBegin, raidAfterStart, raidStop, raidNextStage,
// raidWin, raidReport, raidShowOver, raidHostSend, raidApply, raidHud, raidRequest, raidMe), src/zombies.js
// (zmFrame and zmTick: held still in a cinematic; zmAgain), src/fps.js (fpsDrawScene's camera, fpsDraw's HUD,
// fpsShoot), src/zmnet.js (the lobby's fifth card, the mission in the start), src/raidmusic.js, src/crates.js (the
// save), src/menudesk.js (the tenth game), src/share.js, index.html (its card), src/style.css.

var CP_MISSIONS = [];
const CP_BY = {};
// the acts, in order
const CP_ACTS = [null,
  { n: 'Before the Light', when: 'c. 1200 to 1790' },
  { n: 'The Light', when: '1841 to 1887' },
  { n: 'The Strange Year', when: '1888' },
  { n: 'After the Gannet', when: '1888 to 1891' },
  { n: 'The Years After', when: 'Undated' }];
// the people who speak: a name and a colour
var CP_CAST = {
  log: { n: 'The Keeper’s Log', c: '#e8dcc0', narr: true },
  holm: { n: 'Holm', c: '#ffd88a' },
  maren: { n: 'Maren', c: '#9fd8e8' },
  plim: { n: 'Plimsoll', c: '#8ab4ff' },
  lamp: { n: 'The Lampwright', c: '#f0c070' },
  fire: { n: 'The Fire-Keeper', c: '#ff9a5a' },
  fog: { n: 'The Fog-Keeper', c: '#b8c8d8' },
  crane: { n: 'Captain Crane', c: '#c8a0a0' },
  bosun: { n: 'The Bosun', c: '#a8b890' },
  knock: { n: 'Knock', c: '#e0a060' },
  verity: { n: 'Verity', c: '#f0f0f0' },
  moon: { n: 'A Mooncusser', c: '#d8c070' },
  wreck: { n: 'A Wrecker', c: '#d89070' },
  factor: { n: 'The Factor', c: '#d8b060' },
  mayor: { n: 'The Mayor of Wrackhaven', c: '#c0b090' },
  crew: { n: 'Crew', c: '#ece4cf' },
};
function cpCast(k, def) { CP_CAST[k] = Object.assign({ n: k, c: '#ece4cf' }, def); return CP_CAST[k]; }
// music that isn't made yet plays one that is (src/raidmusic.js): the campaign's keys, and what each falls back to
const CP_MUSIC_FALL = { cpmenu: 'gwwin', cpwin: 'gwwin', cplose: null, cptense: 'gwhold', cpsail: 'gwsail', cpfight: 'frisle', cpboss: 'frboss', cpsad: 'raidpier', cpfog: 'frsail', cpcave: 'raidcave', cphope: 'gwwin' };
Object.assign(RM_LOOP, { cphope: false });   // (the hopeful closing theme: played once through, as the outros end)

const CPC = { LIVES: 1, BACK: 10, KEEP: 'skerry-campaign', PICK: 'skerry-cp-pick', SAY: 5.5 };
var CP = { on: false, mid: null, want: null, from: 0, debug: null, obj: '', ev: [], eseq: 0, evSeen: -1, sub: null, subs: [], won: false, lost: '', fail: '', outroDone: false, nextOk: -1, life: 0, backT: 0, kit: null, startT: 0 };
// progress on this browser: { done: { id: { n: times finished, t: best seconds, d: first finished (YYYY-MM-DD) } } }
var CPS = { done: {} };

// ---------- registering ----------
function cpMission(def) {
  const M = Object.assign({ act: 1, n: def.id, when: '', where: '', blurb: '', stages: [], cut: {}, after: {}, music: {}, lives: CPC.LIVES }, def);
  if (CP_BY[M.id]) CP_MISSIONS.splice(CP_MISSIONS.indexOf(CP_BY[M.id]), 1, M); else CP_MISSIONS.push(M);
  CP_BY[M.id] = M;
  CP_MISSIONS.sort((a, b) => a.id < b.id ? -1 : 1);
  return M;
}
function cpStage(key, stage) { stage.cp = key; RAID_STAGES['cp_' + key] = stage; return stage; }
const cpNow = () => CP.on ? CP_BY[CP.mid] || null : null;
const cpIndex = id => CP_MISSIONS.findIndex(M => M.id === id);

// ---------- the map, as src/zombies.js and src/raid.js see it ----------
ZM_MAPS.campaign = Object.assign({}, ZM_MAPS.raid, { n: 'The Chronicle of the Light', N: 'The Chronicle of the Light', seed: 0xc4a91, cp: true,
  blurb: 'A campaign through the whole history of the Light, alone or up to four.',
  land: n => { const M = CP_BY[CP.mid]; return M ? `${M.when}. ${M.where}${n ? ', ' + n + ' of you' : ''}.` : 'The Chronicle of the Light.'; } });
RAIDS.campaign = { n: 'The Chronicle of the Light', own: true, at: {}, mvp: '-',
  // (the mission's stages, as raidBegin takes them: the one wanted, or the one picked on the card)
  get order() { const M = CP_BY[CP.want] || CP_BY[CP.pick] || CP_MISSIONS[0]; const o = M ? M.stages.filter(k => RAID_STAGES[k]) : []; return o.length ? o : ['descent']; },
  lost: n => CP.fail || `The tale ends at ${n}`, won: 'Mission complete', again: 'Play it again' };

// ---------- progress ----------
function cpLoad() { try { const d = JSON.parse(localStorage.getItem(CPC.KEEP) || 'null'); if (d) cpMerge(d, true); } catch (e) {} }
function cpSave() { try { localStorage.setItem(CPC.KEEP, JSON.stringify(CPS)); } catch (e) {} }
// (crates.js saveData) what goes in the save
function cpData() { return Object.keys(CPS.done).length ? { done: CPS.done } : undefined; }
// (crates.js mergeSave, and loading) a save's progress merged with this browser's: more times, the better time
function cpMerge(d, quiet) {
  if (!d || typeof d !== 'object' || !d.done || typeof d.done !== 'object') return false;
  let ch = false;
  for (const [id, v] of Object.entries(d.done)) {
    if (!/^m\d\d$/.test(id) || !v || typeof v !== 'object') continue;
    const o = CPS.done[id] || (CPS.done[id] = { n: 0, t: 0, d: '' }), n = clamp(v.n | 0, 0, 99999), t = Math.max(0, +v.t || 0);
    if (n > o.n) { o.n = n; ch = true; }
    if (t > 0 && (!o.t || t < o.t)) { o.t = Math.round(t); ch = true; }
    if (typeof v.d === 'string' && /^\d{4}-\d\d-\d\d$/.test(v.d) && (!o.d || v.d < o.d)) { o.d = v.d; ch = true; }
    if (!o.n && !o.t) delete CPS.done[id];
  }
  if (ch && !quiet) { cpSave(); cpCard(); }
  return ch;
}
const cpIsDone = id => !!(CPS.done[id] && CPS.done[id].n > 0);
// open: the first, and each one after a mission done
function cpIsOpen(id) { const i = cpIndex(id); if (i <= 0) return i === 0; return cpIsDone(CP_MISSIONS[i - 1].id) || cpIsDone(id); }
function cpComplete(id, secs) {
  const o = CPS.done[id] || (CPS.done[id] = { n: 0, t: 0, d: '' });
  const first = !o.n;
  o.n++; if (secs > 0 && (!o.t || secs < o.t)) o.t = Math.round(secs);
  if (!o.d) o.d = new Date().toISOString().slice(0, 10);
  cpSave();
  try { if (typeof saveCrates === 'function') saveCrates(); } catch (e) {}
  return first;
}

// ---------- starting, and stopping (src/raid.js) ----------
// (src/zmnet.js znBegin) the mission the host picked, and where in it to start
function cpFrom(st) { if (st && ZM_MAPS[st.map] && ZM_MAPS[st.map].cp && CP_BY[st.cm]) { CP.want = st.cm; CP.from = clamp(st.cf | 0, 0, CP_BY[st.cm].stages.length - 1); cpAudioWant(st.cm); } }
// (raidBegin, with RAID.map set) is this the campaign? Its mission's stages into the raid's order
function cpBegin() {
  CP.on = RAID.map === 'campaign';
  if (!CP.on) return;
  const M = CP_BY[CP.want] || CP_BY[CP.pick] || CP_MISSIONS[0];
  Object.assign(CP, { mid: M.id, wp: null, obj: '', ev: [], eseq: 0, evSeen: -1, sub: null, subs: [], won: false, lost: '', fail: '', outroDone: false, nextOk: -1, life: 0, backT: 0, kit: null, startT: 0 });
  CP.want = M.id; cpAudioWant(M.id);
  RAID_ORDER.length = 0; RAID_ORDER.push(...RAIDS.campaign.order);
  if (typeof cpcReset === 'function') cpcReset();
  try { if (M.begin) M.begin(); } catch (e) { console.warn('cp begin', e); }
}
// (raidAfterStart) laid out, and we know who's in it: the intro, or straight to the checkpoint
function cpAfterStart() {
  const M = cpNow(); if (!M) return;
  CP.life = ZM.net ? (M.lives == null ? CPC.LIVES : M.lives) : 0;
  { const e = document.querySelector('#fpsMenu .eyebrow'); if (e) e.textContent = M.n; $('fpsLeave').textContent = 'Leave the mission'; $('fpsResume').textContent = 'Back to the mission'; }
  const from = CP.debug ? CP.debug.stage | 0 : CP.from | 0; CP.from = 0;
  const dbg = CP.debug; CP.debug = null;
  if (dbg && typeof RCL !== 'undefined' && RCL.picking) rclChoose(RCL.last || 'merc');
  if (ZM.net === 'client') return;
  // (a checkpoint, or a test: no intro; raidUseStage plays the stage's own cutscene)
  if (from > 0 && from < RAID_ORDER.length) { raidUseStage(from); return; }
  if (dbg && dbg.noCine) return;
  if (M.intro && typeof cpCine === 'function') cpCine(M.intro, () => cpStageBegun(0)); else cpStageBegun(0);
}
// (each stage laid out, hosting or alone: raidUseStage, and the first after its intro) its own cutscene
function cpStageBegun(i) {
  const M = cpNow(); if (!M || ZM.net === 'client') return;
  const c = M.cut && M.cut[i];
  if (c && typeof cpCine === 'function') cpCine(c);
}
function cpStop() {
  const M = CP_BY[CP.mid];
  if (CP.on && M && M.stop) try { M.stop(); } catch (e) { console.warn('cp stop', e); }
  if (typeof cpcStop === 'function') cpcStop();
  CP.on = false; CP.obj = ''; CP.sub = null; CP.subs = [];
}

// ---------- the parts, one after another ----------
// (raidNextStage, hosting or alone) true: held for a cinematic first (it calls raidNextStage again once it's over)
function cpNextHold() {
  const M = cpNow(); if (!M) return false;
  const i = RAID.stage, c = M.after && M.after[i];
  if (c && CP.nextOk !== i && typeof cpCine === 'function') { cpCine(c, () => { CP.nextOk = i; raidNextStage(); }); return true; }
  return false;
}
function cpDone() { if (!CP.on || ZM.net === 'client' || ZM.over) return; if (typeof cpCineOn === 'function' && cpCineOn()) return; raidNextStage(); }
// (raidWin, hosting or alone) true: held for the outro (it calls raidWin again once it's over)
function cpWinHold() {
  const M = cpNow(); if (!M) return false;
  if (M.outro && !CP.outroDone && typeof cpCine === 'function') { CP.outroDone = true; cpCine(M.outro, () => raidWin()); return true; }
  return false;
}
function cpFail(why) { if (!CP.on || ZM.net === 'client' || ZM.over) return; CP.fail = String(why || ''); cpEvent('fail', CP.fail); zmEnd(); }
// (raidReport, as it ends) won: marked done on this screen, and the crates a raid pays
function cpReport() {
  if (RAID.told) return; RAID.told = true;
  const M = cpNow(); if (!M) return;
  if (RAID.won) { CP.first = cpComplete(M.id, RAID.t); if (CP.first) { if (typeof wcEarn === 'function') wcEarn('round'); if (typeof ocEarn === 'function') ocEarn('round'); } }
}

// ---------- lines, the objective, and what happens ----------
function cpSay(who, text, vo) { if (!CP.on || ZM.net === 'client') return; cpEvent('say', [String(who || ''), String(text || ''), String(vo || '')]); }
function cpObjective(text) { if (!CP.on || ZM.net === 'client') return; CP.obj = String(text || ''); }
// (hosting or alone) an event, here and in the host's word: 'say' ([who, text, vo]), 'fail' (why), or a mission's own
function cpEvent(k, a) {
  if (ZM.net === 'client') return;
  CP.ev.push([++CP.eseq, k, a == null ? null : a]); if (CP.ev.length > 12) CP.ev.shift();
  cpEventHere(k, a);
}
const CP_ON = {};
function cpOn(k, cb) { (CP_ON[k] || (CP_ON[k] = [])).push(cb); }
function cpEventHere(k, a) {
  if (k === 'say' && Array.isArray(a)) cpSub(a[0], a[1], a[2]);
  else if (k === 'fail') CP.fail = String(a || '');
  for (const cb of CP_ON[k] || []) try { cb(a); } catch (e) { console.warn('cpOn ' + k, e); }
}
// a subtitle on this screen (and its recording, if there is one): queued behind whatever's still showing
function cpSub(who, text, vo) {
  text = String(text || '').slice(0, 300); if (!text) return;
  const C = CP_CAST[who] || { n: who, c: '#ece4cf' };
  const V = vo && typeof CP_VO !== 'undefined' && CP_VO[vo];   // (shown at least as long as it's said)
  const d = Math.max(clamp(1.6 + text.length * 0.055, 2.4, 8), V ? V[2] + 0.4 : 0);
  CP.subs.push({ who: C.n, c: C.c, narr: !!C.narr, text, vo: vo || '', d, t: 0 });
  if (CP.subs.length > 4) CP.subs.shift();
}
// a line said aloud: its stretch of the mission's voice recording (src/cpaudio.js CP_VO: [mission, start, length]; the
// lines one after another in assets/sfx/cpvo_<mission>_1.mp3, made by tools/sfx/cpvoice.py), else a recording of its own
function cpVoice(vo) {
  if (!vo || typeof sfxPlay !== 'function') return false;
  try {
    const V = typeof CP_VO !== 'undefined' && CP_VO[vo], L = V && SFXB.buf['cpvo_' + V[0]], c = AUD.ctx;
    if (!V || !L || !L.length || !c) return sfxPlay('vo_' + vo, { vol: 0.95, vary: 0 });
    if (soundOff()) return true;
    const s = c.createBufferSource(); s.buffer = L[0];
    const g = c.createGain(); g.gain.value = 0.95;
    s.connect(g).connect(AUD.master); s.start(c.currentTime, V[1], V[2]);
    return true;
  } catch (e) { return false; }
}
// (as a mission is picked or begun) its recordings fetched, and the last one's let go (src/sfxbank.js sfxbWant)
function cpAudioWant(mid) { if (mid && typeof CP_AUDIO !== 'undefined' && typeof sfxbWant === 'function') sfxbWant([...(CP_AUDIO.all || []), ...(CP_AUDIO[mid] || [])]); }
// (each frame, everyone) the subtitles' clock
function cpSubTick(dt) {
  const s = CP.subs[0]; if (!s) return;
  if (s.t === 0) cpVoice(s.vo);
  s.t += dt; if (s.t >= s.d) CP.subs.shift();
}

// ---------- each frame, everyone (raidMe) ----------
function cpMe(dt) {
  cpSubTick(dt);
  if (CP.backT > 0 && !ZM.over) { CP.backT -= dt; if (CP.backT <= 0) cpBack(); }
  if (!ZM.ghost && CP.backT > 0 && !zmIsDown()) CP.backT = 0;
  if (typeof cpcTick === 'function') cpcTick(dt);
}
// lives (together): the first bleed-out, back on your feet CPC.BACK seconds later at the stage's start
function cpBledOut(kit) {
  if (!CP.on || CP.life <= 0) return false;
  CP.life--; CP.kit = kit || null; CP.backT = CPC.BACK;
  ZM.banner = { text: 'You bled out', t: 3, sub: `Back on your feet in ${CPC.BACK} seconds`, col: '#ffe2a8' };
  return true;
}
function cpBack() {
  CP.backT = 0; if (!ZM.ghost) return;
  const m = FPS.me;
  ZM.ghost = false; ZM.downT = 0; m.dead = 0; m.hp = ZMC.HP; m.protect = 3; m.iframe = ZMC.IFRAME_UP;
  if (CP.kit) { ZM.downKit = CP.kit; CP.kit = null; zmDownDisarm(); } else raidLoadout();
  const slot = Math.max(0, ZM.hum.findIndex(h => h[0] === m.id));
  m.x = FPSC.CX + ZMD.START[0] + [0, 1.5, -1.5, 0][slot % 4]; m.y = FPSC.CY + ZMD.START[1] + [0, -1.6, -1.6, 1.8][slot % 4]; m.jz = m.fl = ZMD.TOP; m.vz = 0;
  ZM.banner = { text: 'Back on your feet', t: 2.5, small: true, col: '#ffe2a8' };
}

// ---------- playing together (src/zmnet.js, through src/raid.js) ----------
// the host's word: cpw = [mission, objective, events]; and the cinematic (src/cpcine.js cpcPack)
function cpPack(z) {
  z.cpw = [CP.mid, CP.obj, CP.ev];
  if (typeof cpWpPack === 'function') cpWpPack(z);   // (src/cpkit.js)
  if (typeof cpcPack === 'function') cpcPack(z);
}
function cpApply(hz) {
  const a = hz.cpw; if (!Array.isArray(a)) return;
  CP.obj = znClean(a[1], 140);
  if (Array.isArray(a[2])) {
    if (CP.evSeen < 0) { CP.evSeen = 0; for (const e of a[2]) if (Array.isArray(e)) CP.evSeen = Math.max(CP.evSeen, e[0] | 0); }
    for (const e of a[2]) {
      if (!Array.isArray(e) || !((e[0] | 0) > CP.evSeen)) continue; CP.evSeen = e[0] | 0;
      const k = String(e[1] || ''), v = e[2];
      cpEventHere(k, k === 'say' && Array.isArray(v) ? [znClean(v[0], 16), znClean(v[1], 300), znClean(v[2], 40)] : v);
    }
  }
  if (typeof cpWpApply === 'function') cpWpApply(hz);
  if (typeof cpcApply === 'function') cpcApply(hz);
}
function cpAsk(k, a) { if (ZM.net === 'client') zmnRequest('raid', [k, a]); else cpQ(FPS.me.id, k, a); }
// (hosting) a joined player's ask
function cpQ(sid, k, a) { if (k === 'cpskip' && typeof cpcSkipVote === 'function') cpcSkipVote(sid); }

// ---------- painted on top (raidHud) ----------
function cpHudTitle(S) { const M = cpNow(); return M ? `${M.n} · ${S && S.n || ''}` : ''; }
function cpHud(phone, mono, fell) {
  // the objective, under the title at the top left
  if (CP.obj && !ZM.over) {
    const top = fpsHudTop() + (phone ? 46 : 62), L = Math.max(14, FPS.safeLeft || 0);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 11 : 13);
    const tx = '◆ ' + CP.obj, w = Math.min(W * 0.55, ctx.measureText(tx).width + 16);
    ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fillRect(L - 6, top - 4, w, phone ? 20 : 24);
    ctx.fillStyle = '#ffd88a'; ctx.fillText(tx, L, top, W * 0.55 - 12);
  }
  if (typeof cpWpHud === 'function') cpWpHud(phone, mono);
  if (CP.backT > 0 && ZM.ghost) { ctx.textAlign = 'center'; ctx.font = fell(phone ? 18 : 24); ctx.fillStyle = '#ffe2a8'; ctx.fillText(`Back on your feet in ${Math.max(1, Math.ceil(CP.backT))} s`, cx, H * 0.36); }
  cpSubHud(phone, mono, fell, false);
  ctx.textBaseline = 'alphabetic';
}
// the subtitle now showing: low in the middle (in a cinematic, in the bar under the picture)
function cpSubHud(phone, mono, fell, cine) {
  const s = CP.subs[0]; if (!s) return;
  const a = clamp(Math.min(s.t * 5, (s.d - s.t) * 3), 0, 1), y = cine ? H - H * 0.055 : H - (phone ? 190 : 150);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = (s.narr ? 'italic ' : '') + fell(phone ? 16 : 22);
  const lines = cpWrap(s.text, Math.min(W - 40, phone ? W - 30 : 900));
  const lh = phone ? 20 : 28, h0 = lines.length * lh + (phone ? 18 : 24);
  if (!cine) { ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(cx - Math.min(W - 20, (phone ? W : 940)) / 2, y - h0 / 2 - 8, Math.min(W - 20, phone ? W : 940), h0 + 12); }
  const y0 = y - (lines.length - 1) * lh / 2 + (phone ? 8 : 10);
  ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = s.c; ctx.fillText(s.narr ? '' : s.who.toUpperCase(), cx, y0 - (phone ? 18 : 24));
  ctx.font = (s.narr ? 'italic ' : '') + fell(phone ? 16 : 22); ctx.fillStyle = s.narr ? '#e8dcc0' : '#f4eedf';
  lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lh));
  ctx.restore();
}
function cpWrap(text, w) {
  const out = []; let cur = '';
  for (const word of text.split(/\s+/)) { const t = cur ? cur + ' ' + word : word; if (ctx.measureText(t).width > w && cur) { out.push(cur); cur = word; } else cur = t; }
  if (cur) out.push(cur); return out.slice(0, 4);
}

// ---------- the end of a mission (raidShowOver) ----------
function cpShowOver() {
  const M = cpNow(); if (!M) return false;
  const i = cpIndex(M.id), next = CP_MISSIONS[i + 1], S = RAID_STAGES[RAID_ORDER[RAID.stage]];
  if ($('zmOverEye')) $('zmOverEye').textContent = `The Chronicle of the Light · ${M.n}`;
  $('zmOverHead').textContent = RAID.won ? (next ? 'Mission complete' : 'The Chronicle is told') : (CP.fail || `The tale ends at ${S ? S.n : 'the dark'}`);
  $('zmOverStats').textContent = (ZM.net ? `${ZM.hum.length} of you. ` : '') + (RAID.won ? `${M.n} done in ${raidClock(RAID.t)}. ` : `${RAID.stage} of ${RAID_ORDER.length} parts done. `) + `${ZM.kills} of the drowned sent back.`;
  const o = CPS.done[M.id];
  $('zmOverBest').textContent = RAID.won ? (CP.first ? 'First time through: a weapon crate and an outfit crate. ' : '') + (o && o.t ? `Your best: ${raidClock(o.t)}. ` : '') + (next ? `Next: ${next.n} (${next.when}).` : 'Every tale of the Light, told.') : 'Try again from the part you reached, or from the start.';
  const nb = $('cpNext'), rb = $('cpRetry');
  if (nb) { nb.hidden = !(RAID.won && next && !ZM.net); nb.textContent = next ? `Next: ${next.n}` : ''; nb.onclick = () => { CP.pick = next.id; cpPickSave(); fpsStop(); setTimeout(() => cpPlay(next.id), 0); }; }
  if (rb) { rb.hidden = !!(RAID.won || ZM.net || RAID.stage === 0); rb.textContent = `Try again from part ${raidNumeral(RAID.stage + 1)}`; const st = RAID.stage; rb.onclick = () => { fpsStop(); setTimeout(() => cpPlay(M.id, st), 0); }; }
  // together, the lobby's next start picks up from the checkpoint
  CP.retry = !RAID.won ? { id: M.id, st: RAID.stage } : null;
  $('zmOver').hidden = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  setTimeout(() => { const b = nb && !nb.hidden ? nb : $('zmAgain'); b.focus(); }, 30);
  return true;
}
// (the over card hides these elsewhere)
function cpOverHide() { if ($('cpNext')) $('cpNext').hidden = true; if ($('cpRetry')) $('cpRetry').hidden = true; }

// ---------- music (src/raidmusic.js) ----------
const cpHas = k => !!(k && typeof SFXB !== 'undefined' && SFXB.buf[k] && SFXB.buf[k].length);
function cpMusicKey(k) { let n = 0; while (k && !cpHas(k) && n++ < 4) k = CP_MUSIC_FALL[k] !== undefined ? CP_MUSIC_FALL[k] : null; return k || null; }
function cpMusic() {
  if (!CP.on || !RAID.on) return undefined;
  if (ZM.over) return RAID.won ? cpMusicKey('cpwin') : null;
  const c = typeof cpcMusic === 'function' ? cpcMusic() : undefined; if (c !== undefined) return cpMusicKey(c);
  const S = raidStage(), M = cpNow();
  if (S && S.cp && typeof S.music === 'function') return cpMusicKey(S.music());
  if (S && !S.cp) return undefined;   // (another raid's stage: its own music, as ever)
  return cpMusicKey(M && M.music && M.music.default || 'cptense');
}

// ---------- its card on the title screen ----------
CP.pick = null;
try { CP.pick = localStorage.getItem(CPC.PICK); } catch (e) {}
function cpPickSave() { try { localStorage.setItem(CPC.PICK, CP.pick || ''); } catch (e) {} }
// (src/zmnet.js) together, the host's mission and checkpoint for the start
function cpStartFor(st) {
  const id = CP_BY[CP.pick] && cpIsOpen(CP.pick) ? CP.pick : (CP_MISSIONS.find(M => cpIsOpen(M.id) && !cpIsDone(M.id)) || CP_MISSIONS[0] || {}).id;
  st.cm = id; if (CP.retry && CP.retry.id === id) st.cf = CP.retry.st; CP.retry = null;
}
function cpPlay(id, from) {
  if (FPS.on || !CP_BY[id]) return;
  if (typeof znSoloOk === 'function' && !znSoloOk('cp')) return;
  CP.want = id; CP.from = from | 0; CP.pick = id; cpPickSave();
  zmStart({ map: 'campaign' });
}
const cpEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function cpCard() {
  const box = $('cpList'); if (!box) return;
  if (!CP_BY[CP.pick] || !cpIsOpen(CP.pick)) CP.pick = (CP_MISSIONS.find(M => cpIsOpen(M.id) && !cpIsDone(M.id)) || CP_MISSIONS.filter(M => cpIsOpen(M.id)).pop() || CP_MISSIONS[0] || {}).id;
  const done = CP_MISSIONS.filter(M => cpIsDone(M.id)).length;
  let h = '', act = 0;
  for (const M of CP_MISSIONS) {
    if (M.act !== act) { act = M.act; const A = CP_ACTS[act] || {}; h += `<div class="cp-act"><span>Act ${raidNumeral(act)}</span> ${cpEsc(A.n || '')} <small>${cpEsc(A.when || '')}</small></div>`; }
    const open = cpIsOpen(M.id), dn = cpIsDone(M.id), on = M.id === CP.pick, n = cpIndex(M.id) + 1;
    h += `<button type="button" class="cp-m${on ? ' on' : ''}${dn ? ' done' : ''}" data-m="${M.id}"${open ? '' : ' disabled'} aria-pressed="${on}"><span class="cp-n">${n}</span><span class="cp-t"><b>${cpEsc(open ? M.n : 'Not yet told')}</b><small>${cpEsc(M.when)}${open && M.where ? ' · ' + cpEsc(M.where) : ''}</small></span><span class="cp-s">${dn ? '✓' + (CPS.done[M.id].t ? ' ' + raidClock(CPS.done[M.id].t) : '') : open ? 'New' : '🔒'}</span></button>`;
  }
  box.innerHTML = h;
  for (const b of box.querySelectorAll('.cp-m')) b.addEventListener('click', () => { if (typeof ZN !== 'undefined' && ZN.code && !znAmHost()) return; CP.pick = b.dataset.m; cpPickSave(); cpCard(); if (typeof znSendLobby === 'function' && ZN.code) znSendLobby(); });
  const M = CP_BY[CP.pick];
  if ($('cpPicked')) $('cpPicked').innerHTML = M ? `<b>${cpEsc(M.n)}</b> <span class="muted">${cpEsc(M.when)}</span><br>${cpEsc(M.blurb)}` : '';
  if ($('cpProgress')) $('cpProgress').textContent = `${done} of ${CP_MISSIONS.length} missions done.`;
  if ($('cpPlay')) $('cpPlay').textContent = M && cpIsDone(M.id) ? 'Play it again' : 'Play';
}
// (a test, or the console) straight into a mission alone, at a stage
function cpDebug(id, stage, noCine) {
  if (FPS.on) return false;
  id = CP_BY[id] ? id : CP_MISSIONS[0].id;
  CP.debug = { stage: stage | 0, noCine: !!noCine }; CP.want = id; CP.from = stage | 0;
  zmStart({ map: 'campaign' });
  return true;
}

(() => {
  cpLoad();
  if (!$('cpTitle')) return;
  $('cpPlay').addEventListener('click', () => { if (CP.pick) cpPlay(CP.pick); });
  $('cpSettings').addEventListener('click', () => $('titleSettings').click());
  if ($('cpBanner')) $('cpBanner').addEventListener('click', () => { $('cpTitle').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('cpPlay').focus({ preventScroll: true }), 400); });
  // (the missions' own files load after this one: draw the list once they have)
  window.addEventListener('load', cpCard);
  setTimeout(cpCard, 0);
})();
