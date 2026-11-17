// Recorded sound effects: real recordings in place of the synthesised sounds wherever one has been made (they were
// generated with Stable Audio 3 in ComfyUI, then trimmed, levelled and made small: tools/sfx/process.py). The list of
// files is src/sfxlist.js (SFX_FILES: a name and its takes; more than one take and each play picks one at random).
// Everything here falls back quietly: sfxPlay answers false when it has nothing for a name (not loaded yet, decoding
// failed, no audio at all), and the caller then makes its old synthesised sound instead.
const SFXB = { buf: {}, loading: false, last: {}, amb: null };

// (from audioInit) fetch and decode every take, in the background
function sfxbLoad() {
  if (SFXB.loading || !AUD.ctx || typeof SFX_FILES === 'undefined') return;
  SFXB.loading = true;
  for (const k in SFX_FILES) if (!sfxbLazy(k)) sfxbFetch(k);
  if (SFXB.want) sfxbWant(SFXB.want);
}
function sfxbFetch(k) {
  if (SFXB.buf[k] || !SFX_FILES[k]) return;
  const L = SFXB.buf[k] = [];
  for (const url of SFX_FILES[k]) {
    fetch(url).then(r => r.arrayBuffer())
      .then(a => new Promise((ok, no) => AUD.ctx.decodeAudioData(a, ok, no)))
      .then(b => { L.push(b); if (k === 'sea' || k === 'wind') sfxbAmbient(); })
      .catch(() => {});
  }
}
// The Chronicle of the Light's recordings (src/cpaudio.js: CP_AUDIO, its music, sound effects and voice lines, a list
// for each mission and one for all of them) are far too many to hold at once, so they're fetched only for the mission
// being played (sfxbWant, from src/cp.js), and the last mission's let go. Until a recording is in, its fallback plays.
const sfxbLazy = k => typeof CP_AUDIO_LAZY !== 'undefined' && CP_AUDIO_LAZY.has(k);
function sfxbWant(names) {
  SFXB.want = names;
  if (!AUD.ctx || !SFXB.loading) return;
  const keep = new Set(names);
  for (const k in SFXB.buf) if (sfxbLazy(k) && !keep.has(k)) delete SFXB.buf[k];
  for (const k of names) sfxbFetch(k);
}

// play a recording: o.vol (0..1, before the master), o.pan (-1..1, or a direction from earDir), o.rate (playback speed), o.vary (random speed
// spread, default ±4%), o.delay (s), o.gap (s: not again within this long, for sounds that come thick and fast),
// o.out (through the outdoor bus, muffled indoors). True if it played (or would have, with the sound off).
function sfxPlay(name, o) {
  o = o || {};
  name = sfxbName(name); const L = SFXB.buf[name], c = AUD.ctx;
  if (!c || !L || !L.length) return false;
  if (soundOff()) return true;
  const now = c.currentTime;
  if (o.gap && SFXB.last[name] != null && now - SFXB.last[name] < o.gap) return true;
  SFXB.last[name] = now;
  // a take at random, but never the same one twice running
  SFXB.lastI = SFXB.lastI || {};
  let i = (Math.random() * L.length) | 0;
  if (L.length > 1 && i === SFXB.lastI[name]) i = (i + 1 + ((Math.random() * (L.length - 1)) | 0)) % L.length;
  SFXB.lastI[name] = i;
  const s = c.createBufferSource(); s.buffer = L[i];
  const vary = o.vary == null ? 0.08 : o.vary;
  s.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - 0.5) * vary);
  const g = c.createGain(); g.gain.value = Math.max(0, o.vol == null ? 1 : o.vol);
  let dest = o.out && AUD.outF ? AUD.outF : AUD.master;
  dest = panNode(o.pan || AUD.place, dest);   // (a plain pan, or a direction: earDir in audio.js)
  s.connect(g).connect(dest);
  s.start(now + (o.delay || 0));
  return true;
}
// is there a recording for this name yet?
const sfxHas = name => { name = sfxbName(name); return !!(SFXB.buf[name] && SFXB.buf[name].length && AUD.ctx); };
// (a sound recorded once and used for another: src/cpaudio.js CP_SFX_ALIAS, e.g. the Reach's beacon is Signal Head's)
function sfxbName(n) { return SFXB.buf[n] || typeof CP_SFX_ALIAS === 'undefined' || !CP_SFX_ALIAS[n] ? n : CP_SFX_ALIAS[n]; }

// the sea and the wind: recorded loops under the synthesised swell, through the outdoor bus (muffled indoors); once
// they're in, the synthesised sea and wind drop back to a whisper beneath them
function sfxbAmbient() {
  const c = AUD.ctx; if (!c || !AUD.outF) return;
  SFXB.amb = SFXB.amb || {};
  for (const [k, vol] of [['sea', 0.55], ['wind', 0.32]]) {
    if (SFXB.amb[k] || !sfxHas(k)) continue;
    const s = c.createBufferSource(); s.buffer = SFXB.buf[k][0]; s.loop = true;
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(vol, c.currentTime, 1.5);
    s.connect(g).connect(AUD.outF); s.start(0, Math.random() * s.buffer.duration);
    SFXB.amb[k] = { s, g };
    if (k === 'sea' && AUD.seaG) { AUD.seaG.gain.setTargetAtTime(0.1, c.currentTime, 1.5); AUD.swellAmt.gain.setTargetAtTime(0.05, c.currentTime, 1.5); }
    if (k === 'wind' && AUD.windG) { AUD.windG.gain.setTargetAtTime(0.008, c.currentTime, 1.5); AUD.gustAmt.gain.setTargetAtTime(0.006, c.currentTime, 1.5); }
  }
}

// the announcer: a deep voice calling a power-up's name as it's taken. A recorded line ('vo_<key>' in SFX_FILES) if
// there is one; otherwise the browser's own speech, slowed and pitched right down. Quietly nothing if neither exists.
const SFXV = { voice: null, picked: false };
function sfxbVoice() {
  if (SFXV.picked || typeof speechSynthesis === 'undefined') return SFXV.voice;
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  if (!vs.length) return null;
  SFXV.picked = true;
  const deep = /david|george|daniel|guy|ryan|thomas|fred|ralph|james|mark|male|arthur|oliver/i;
  SFXV.voice = vs.find(v => deep.test(v.name) && /GB|UK/i.test(v.lang)) || vs.find(v => deep.test(v.name)) || vs[0];
  return SFXV.voice;
}
if (typeof speechSynthesis !== 'undefined') try { speechSynthesis.onvoiceschanged = () => { SFXV.picked = false; sfxbVoice(); }; } catch (e) {}
function sfxAnnounce(key, text) {
  if (sfxPlay('vo_' + key, { vol: 1, vary: 0, delay: 0.12 })) return;
  if (soundOff() || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = sfxbVoice(); if (v) u.voice = v;
    u.pitch = 0.15; u.rate = 0.78; u.volume = Math.max(0, Math.min(1, masterLevel() / 0.85));
    setTimeout(() => speechSynthesis.speak(u), 150);
  } catch (e) {}
}
