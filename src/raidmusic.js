// Maren's End: the raid's music. Each part has its own, made with Stable Audio 3 in ComfyUI (three takes of each, the
// best looping one kept; tools/sfx/music.py), and each player's own game picks what's playing from what they see:
//   raidpier    along the Long Pier, over the dry bed of the sea: sad and ghostly, a slow cello, a far-off voice,
//               the wind over the salt and old wrecks creaking
//   raidfall    off the end of the pier and down the Swallow: a dark, deep chant of low voices (taken down three
//               semitones), far off at first, swelling with drums and low brass as you go down, timed (from how far there is to fall) so its climax comes as you hit the floor (played
//               once, not looped)
//   raidcave    the Deep Path at the bottom: eerie and underground, drones, dripping water, a lonely concertina's slow
//               shanty and creaking timbers (the fall track hands over to it as you land)
//   raidbridge  the black river (part two): another eerie underground piece, rushing water, a hurdy-gurdy drone,
//               creaking rope and far-off sailors humming
//   raidfort    the Spanish sea fort (part three): dark flamenco guitar, castanets and brass
//   raidknock   the Knock's fight: suspense over the heavy thump of a wooden bat
//   raidsong    the Knock's song: a dark chant over knocking that gets quicker and quicker (and higher) through its
//               fifteen seconds, until it's sung or broken
//   raidmaren   Maren: a ghostly boss fight, wailing choir, war drums, a shanty fiddle and a foghorn (from “Maren is
//               angered” until she's down)
//   raidmaren2  her second phase (from a third of her strength, src/raidfort.js RF.p2): her last stand in the storm, a
//               great iron bell tolling, a screaming choir, war drums; low while she summons the storm (RF.p2i), then full, swelling on
//               each bell toll and lightning flash (RF.tide)
//   raidwin     Maren down: bittersweet, a sunset over the sea after a hard fight, a slow shanty on fiddle and
//               concertina over warm strings, a far-off ship's horn, the waves (played once, on into the end card)
// And in her second phase, her storm (sounds, not music): a thunder crack with each lightning flash (stormbolt, from
// RF.bolt) and a high swirling wind (stormwind, looped, gusting with RF.tide) until she's down.
// Once it's over otherwise (all of you down, or left), nothing plays. While the raid's on, the Lighthouse's boss
// themes (src/zmtheme.js) keep quiet: this is the music. Nothing plays until its recording has loaded.
const RM = { WIND: 0.1, wind: null, bolt: null, fell: false, cur: null, src: null, gain: null, vol: 0.55, rate: 1 };
const RM_LOOP = { raidfall: false, raidwin: false };
const RM_TAIL = 2.5;   // (the fall's track runs on this long after its climax: tools/sfx/music.py TAIL)

// what should be playing now
function rmWant() {
  if (!RAID.on) RM.fell = RM.wonDone = false;
  // Maren down: the sunset, played once through (on to the end card), then quiet
  if (RAID.on && (RAID.won || (RAID_ORDER[RAID.stage] === 'fort' && typeof RF !== 'undefined' && RF.st === 'won'))) { if (RM.cur === 'raidwin' && RM.done) RM.wonDone = true; return RM.wonDone ? null : 'raidwin'; }
  if (!RAID.on || ZM.over) return null;
  { const v = typeof rvMusic === 'function' ? rvMusic() : undefined; if (v !== undefined) return v; }   // [verity] (src/raidverity.js)
  const k = RAID_ORDER[RAID.stage];
  { const S = raidStage(); if (S && typeof S.music === 'function') return S.music(); }   // (a part with its own say: The Gannet's Wake's)
  if (k === 'descent') { const S = RAID.st || {}; return S.landed || RM.fell ? 'raidcave' : S.falling || RM.cur === 'raidfall' ? 'raidfall' : 'raidpier'; }
  RM.fell = false;
  if (k === 'bridge') return 'raidbridge';
  if (k === 'fort' && typeof RF !== 'undefined') {
    if (RF.st === 'maren') { const z = ZM.z.find(z => z.bt === 'maren' && !z.dead); return (RF.p2 != null ? RF.p2 : z && z.hp / z.max <= 1 / 3) ? 'raidmaren2' : 'raidmaren'; }
    if (RF.st === 'anger' && RF.angered) return 'raidmaren';
    if (RF.st === 'knock') { const z = ZM.z.find(z => z.bt === 'knock' && !z.dead); return z && z.act === 'song' ? 'raidsong' : 'raidknock'; }
    return 'raidfort';
  }
  return null;
}
// (every frame of the raid, from src/zmtheme.js's ztTick)
function rmTick(dt) {
  if (!AUD.ctx) return;
  // (the fall's track played through before you landed: on to the cave's, early)
  if (RM.cur === 'raidfall' && RM.done) RM.fell = true;
  const want = rmWant();
  if (want !== RM.cur) { if (want) rmPlay(want, want === 'raidwin' ? 3 : want === 'raidmaren2' ? 0.4 : want === 'raidcave' && RM.cur === 'raidfall' ? RM_TAIL : want === 'raidfall' ? 1.5 : want === 'raidsong' || RM.cur === 'raidsong' ? 0.6 : 2); else rmStop(3); }
  // Maren's second phase: the music swells as her tide comes up the fort (RF.tide, 0 to 1)
  // (while she summons the storm, RF.p2i, it comes up from quiet; then full, and it swells on each bell toll and
  //  lightning flash, RF.tide, 0 to 1)
  if (RM.cur === 'raidmaren2' && RM.gain && typeof RF !== 'undefined') RM.gain.gain.setTargetAtTime(RM.vol * (RF.p2i ? 0.35 : 1 + 0.45 * clamp(RF.tide || 0, 0, 1)), AUD.ctx.currentTime, RF.p2i ? 1.2 : 0.25);
  // her storm: a thunder crack with each lightning flash (RF.bolt counts them), and a high swirling wind under it all
  const storm = typeof RF !== 'undefined' && RAID.on && RAID_ORDER[RAID.stage] === 'fort' && RF.st === 'maren' && !!RF.p2 && !ZM.over;
  if (typeof RF !== 'undefined') { if (storm && RM.bolt != null && RF.bolt !== RM.bolt) sfxPlay('stormbolt', { vol: 0.95, vary: 0.1, pan: (Math.random() - 0.5) * 0.8 }); RM.bolt = RF.bolt; }
  rmWind(storm, dt);
  // the song: quicker and quicker, from its first beat to its last
  if (RM.cur === 'raidsong' && RM.src) {
    const z = ZM.z.find(z => z.bt === 'knock' && !z.dead), p = z ? clamp((z.at || 0) / RFK.SONG, 0, 1) : 0;
    RM.src.playbackRate.setTargetAtTime(1 + 0.65 * Math.pow(p, 1.4), AUD.ctx.currentTime, 0.1);
  }
}
function rmWind(on, dt) {
  const c = AUD.ctx;
  if (on && !RM.wind) {
    const L = typeof SFXB !== 'undefined' && SFXB.buf.stormwind; if (!L || !L.length) return;
    const s = c.createBufferSource(); s.buffer = L[0]; s.loop = true;
    const g = c.createGain(); g.gain.value = 0;
    // (kept low and softened, a lowpass taking the shriek off it: background, under the music)
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    s.connect(f).connect(g).connect(AUD.master); s.start(0, Math.random() * L[0].duration * 0.8);
    RM.wind = { s, g };
  }
  if (!RM.wind) return;
  // (it gusts up with each toll and flash, RF.tide; and dies away over a few seconds once the storm's over)
  RM.wind.g.gain.setTargetAtTime(on ? RM.WIND * (1 + 0.3 * clamp(RF.tide || 0, 0, 1)) : 0, c.currentTime, on ? 0.6 : 1.2);
  if (!on) { RM.windOff = (RM.windOff || 0) + dt; if (RM.windOff > 6) { try { RM.wind.s.stop(); } catch (e) {} RM.wind = null; RM.windOff = 0; } } else RM.windOff = 0;
}
// (leaving the raid) everything off
function rmQuiet(fade) { rmStop(fade); if (RM.wind) { try { RM.wind.g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.2); RM.wind.s.stop(AUD.ctx.currentTime + 1); } catch (e) {} RM.wind = null; } RM.bolt = null; }
function rmPlay(k, fade) {
  const L = typeof SFXB !== 'undefined' && SFXB.buf[k];
  if (!L || !L.length) return;   // (not loaded yet: tried again next frame)
  const c = AUD.ctx, b = L[0];
  rmStop(fade);
  const s = c.createBufferSource(); s.buffer = b;
  // (an MP3 carries a sliver of silence at each end: loop only the music between, so the seam doesn't gap)
  if (!b.zt) { const d = b.getChannelData(0); let i = 0, j = d.length - 1; while (i < j && Math.abs(d[i]) < 1e-4) i++; while (j > i && Math.abs(d[j]) < 1e-4) j--; b.zt = [i / b.sampleRate, (j + 1) / b.sampleRate]; }
  if (RM_LOOP[k] !== false) { s.loop = true; s.loopStart = b.zt[0]; s.loopEnd = b.zt[1]; }
  const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(RM.vol, c.currentTime, Math.max(0.1, (fade || 1) / 3));
  // (the fall: started so far in that its climax comes as you land, from how far there is to fall at FALL a second)
  let at = b.zt[0], wait = 0;
  if (k === 'raidfall') { const T = Math.max(0, (FPS.me.jz || 0) - 0.6) / RSW.FALL + 0.5, peak = b.zt[1] - b.zt[0] - RM_TAIL; at += Math.max(0, peak - T); wait = Math.max(0, T - peak); }
  s.connect(g).connect(AUD.master); s.start(c.currentTime + wait, at);
  RM.done = false; s.onended = () => { if (RM.src === s) RM.done = true; };
  RM.cur = k; RM.src = s; RM.gain = g;
}
function rmStop(fade) {
  if (!RM.src) { RM.cur = null; return; }
  const c = AUD.ctx, s = RM.src, g = RM.gain, f = Math.max(0.05, fade || 0.5);
  try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + f); s.stop(c.currentTime + f + 0.05); } catch (e) {}
  RM.src = null; RM.gain = null; RM.cur = null; RM.done = false;
}
