// The Lighthouse (Keeper's Last Light): the bosses' themes. Each of the three has a piece of music of its own,
// made from its design (generated with Stable Audio 3 in ComfyUI, then looped and levelled: tools/sfx/process.py):
//   the Diver       bossdiver: a deep sea-shanty dirge, slow and heavy as his boots, a brass horn like his helmet,
//                   the creak of his air line and a great iron anchor-chain clank on the beat
//   the Mooncusser  bossmoon: a wrecker's waltz, a lone fiddle and a squeezebox in a minor key, the false light's
//                   rising shimmer over it, and the clink of his gibbet chains
//   the Keelback    bosscrab: a scuttling, driving piece, rattling percussion like spars and oars on the rocks,
//                   low timbers groaning, a deep ship's drum, and a bell for its sidelights
// When the first boss of a round comes up, the round's theme is drawn at random from the kinds that round brings
// (ztPick: so a round with the Diver and the Keelback plays one or the other); it plays, looped, while any of them is
// up or still to come, and fades away once the last is down. Together, the host draws it and tells everyone (zbHostSend,
// `bm`), so you all hear the same one. Nothing plays until its recording has loaded (src/sfxbank.js).
const ZTH = { cur: null, src: null, gain: null, quiet: 0, vol: 0.55 };
const ZTH_FILE = { diver: 'bossdiver', moon: 'bossmoon', crab: 'bosscrab' };

// (hosting or alone, from zbSpawn) one is coming: if the round has no theme yet, draw it
function ztPick(kind) {
  if (ZB.theme && ZB.themeRound === ZM.round) return;
  const kinds = [...new Set([kind].concat(ZB.round === ZM.round ? ZB.planAll || [] : []))].filter(k => ZTH_FILE[k]);
  if (!kinds.length) return;
  ZB.theme = kinds[(Math.random() * kinds.length) | 0]; ZB.themeRound = ZM.round;
}
// (joined, from zbApply) the host's draw
function ztHeard(i) {
  const k = ZB_KINDS[i | 0];
  if (k && ZTH_FILE[k]) { ZB.theme = k; ZB.themeRound = ZM.round; }
}

// (every frame of a night) what should be playing, and is it
function ztTick(dt) {
  if (!AUD.ctx) return;
  // (in Maren's End the raid has music of its own, src/raidmusic.js)
  if (typeof RAID !== 'undefined' && RAID.on) { if (ZTH.cur) ztStop(1); if (typeof rmTick === 'function') rmTick(dt); return; }
  if (typeof rmQuiet === 'function' && (RM.cur || RM.wind)) rmQuiet(2);
  const mine = ZB.theme && ZB.themeRound === ZM.round;
  const up = ZM.z.some(z => z.boss && !z.dead && !z.gone);
  const coming = ZM.net !== 'client' && ZB.round === ZM.round && ZB.plan && ZB.plan.length > 0 && ZM.phase === 'round';
  const want = mine && (up || coming) && !ZM.over ? ZB.theme : null;
  if (want) ZTH.quiet = 0; else ZTH.quiet += dt;
  if (want && want !== ZTH.cur) ztPlay(want);
  else if (!want && ZTH.cur && ZTH.quiet > 1.5) ztStop(3);
}
function ztPlay(k) {
  const L = typeof SFXB !== 'undefined' && SFXB.buf[ZTH_FILE[k]];
  if (!L || !L.length) return;   // (not loaded yet: tried again next frame)
  const c = AUD.ctx;
  ztStop(1.2);
  const s = c.createBufferSource(); s.buffer = L[0]; s.loop = true;
  // (an MP3 carries a sliver of silence at each end: loop only the music between, so the seam doesn't gap)
  const b = L[0]; if (!b.zt) { const d = b.getChannelData(0); let i = 0, j = d.length - 1; while (i < j && Math.abs(d[i]) < 1e-4) i++; while (j > i && Math.abs(d[j]) < 1e-4) j--; b.zt = [i / b.sampleRate, (j + 1) / b.sampleRate]; }
  s.loopStart = b.zt[0]; s.loopEnd = b.zt[1];
  const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(ZTH.vol, c.currentTime, 0.8);
  s.connect(g).connect(AUD.master); s.start(0, b.zt[0]);
  ZTH.cur = k; ZTH.src = s; ZTH.gain = g;
}
function ztStop(fade) {
  if (!ZTH.src) { ZTH.cur = null; return; }
  const c = AUD.ctx, s = ZTH.src, g = ZTH.gain, f = Math.max(0.05, fade || 0.5);
  try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + f); s.stop(c.currentTime + f + 0.05); } catch (e) {}
  ZTH.src = null; ZTH.gain = null; ZTH.cur = null;
}
