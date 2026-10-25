// Every sound in the game is synthesised with the Web Audio API, so there are no audio files.
// The context is created on the first button press, since browsers only allow sound after a click.

const AUD = { ctx: null, master: null, muted: false, white: null, brown: null, drone: null, nextBeat: 0, nextCreak: 4, panOK: false };
try { AUD.muted = localStorage.getItem('skerry-muted') === '1'; } catch (e) {}

function audioInit() {
  if (AUD.ctx) { if (AUD.ctx.state === 'suspended') AUD.ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let c;
  try { c = AUD.ctx = new AC(); } catch (e) { return; }
  AUD.panOK = typeof c.createStereoPanner === 'function';

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12; comp.ratio.value = 6;
  comp.connect(c.destination);
  AUD.master = c.createGain();
  AUD.master.gain.value = AUD.muted ? 0 : 0.85;
  AUD.master.connect(comp);

  const len = c.sampleRate * 2;
  AUD.white = c.createBuffer(1, len, c.sampleRate);
  AUD.brown = c.createBuffer(1, len, c.sampleRate);
  const wd = AUD.white.getChannelData(0), bd = AUD.brown.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    wd[i] = w;
    last = (last + 0.02 * w) / 1.02;
    bd[i] = last * 3.5;
  }

  // the sea: brown noise that swells and falls like waves
  const sea = loopNoise(AUD.brown);
  const seaF = c.createBiquadFilter(); seaF.type = 'lowpass'; seaF.frequency.value = 420;
  const seaG = c.createGain(); seaG.gain.value = 0.28;
  const swell = c.createOscillator(); swell.frequency.value = 0.09;
  const swellAmt = c.createGain(); swellAmt.gain.value = 0.14;
  swell.connect(swellAmt).connect(seaG.gain);
  sea.connect(seaF).connect(seaG).connect(AUD.master);
  swell.start();

  // wind in the rigging
  const wind = loopNoise(AUD.white);
  const windF = c.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 650; windF.Q.value = 0.9;
  const windG = c.createGain(); windG.gain.value = 0.02;
  const gust = c.createOscillator(); gust.frequency.value = 0.05;
  const gustAmt = c.createGain(); gustAmt.gain.value = 0.016;
  gust.connect(gustAmt).connect(windG.gain);
  wind.connect(windF).connect(windG).connect(AUD.master);
  gust.start();

  // dread drone, silent until she comes close
  const dF = c.createBiquadFilter(); dF.type = 'lowpass'; dF.frequency.value = 260;
  AUD.drone = c.createGain(); AUD.drone.gain.value = 0;
  for (const f of [49, 49.7, 73.4]) {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.connect(dF); o.start();
  }
  dF.connect(AUD.drone).connect(AUD.master);
}

function loopNoise(buf) {
  const s = AUD.ctx.createBufferSource();
  s.buffer = buf; s.loop = true;
  s.loopStart = Math.random(); s.start(0, Math.random() * 1.5);
  return s;
}

function setMuted(m) {
  AUD.muted = m;
  try { localStorage.setItem('skerry-muted', m ? '1' : '0'); } catch (e) {}
  if (AUD.master) AUD.master.gain.setTargetAtTime(m ? 0 : 0.85, AUD.ctx.currentTime, 0.05);
}

function outNode(pan) {
  const c = AUD.ctx;
  if (AUD.panOK && pan) {
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(AUD.master); return p;
  }
  return AUD.master;
}

function envGain(t, attack, peak, decay, dest) {
  const g = AUD.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest);
  return g;
}

function tone(freq, type, attack, peak, decay, opts = {}) {
  const c = AUD.ctx; if (!c) return;
  const t = c.currentTime + (opts.delay || 0);
  const g = envGain(t, attack, peak, decay, outNode(opts.pan));
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + attack + decay);
  o.connect(g); o.start(t); o.stop(t + attack + decay + 0.05);
}

function noise(filterType, freq, q, attack, peak, decay, opts = {}) {
  const c = AUD.ctx; if (!c) return;
  const t = c.currentTime + (opts.delay || 0);
  const g = envGain(t, attack, peak, decay, outNode(opts.pan));
  const f = c.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + attack + decay);
  const s = c.createBufferSource(); s.buffer = AUD.white;
  s.connect(f).connect(g); s.start(t, Math.random()); s.stop(t + attack + decay + 0.05);
}

function distCurve(k) {
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); }
  return curve;
}

// ---- sound effects ----
function sfxBell() {
  for (const [f, a, d] of [[392, 0.5, 3.6], [988, 0.28, 2.6], [1567, 0.16, 1.8], [2350, 0.08, 1.2], [196, 0.22, 4]]) tone(f, 'sine', 0.004, a, d);
}
function sfxBellFar(pan, vol) {
  for (const [f, a, d] of [[392, 0.32, 3], [988, 0.16, 2], [1567, 0.08, 1.4]]) tone(f, 'sine', 0.004, a * vol, d, { pan });
}
function sfxSplash(pan, vol) {
  if (vol < 0.05) return;
  noise('lowpass', 1400, 0.8, 0.01, 0.35 * vol, 0.35, { pan, to: 400 });
  noise('bandpass', 3000, 2, 0.005, 0.12 * vol, 0.12, { pan, delay: 0.05 });
}
function sfxClaw() {
  noise('highpass', 2500, 1, 0.005, 0.5, 0.25);
  tone(160, 'sawtooth', 0.01, 0.25, 0.4, { to: 70 });
  tone(70, 'sine', 0.005, 0.7, 0.5, { to: 40 });
  noise('bandpass', 900, 4, 0.02, 0.25, 0.4, { delay: 0.12, to: 500 });
}
function sfxCackle(pan) {
  for (let i = 0; i < 6; i++) {
    const f = 380 + Math.random() * 160;
    tone(f, 'sawtooth', 0.01, 0.06, 0.09, { pan, delay: i * 0.11, to: f * 0.8 });
    noise('bandpass', 1800, 5, 0.01, 0.06, 0.08, { pan, delay: i * 0.11 });
  }
}
function sfxFlare() {
  noise('bandpass', 600, 0.8, 0.01, 0.4, 0.6, { to: 3000 });
  noise('highpass', 4000, 0.7, 0.2, 0.15, 1.6, { delay: 0.3 });
  tone(90, 'sine', 0.005, 0.5, 0.4, { to: 50 });
}
function sfxHorn(pan, vol) {
  for (const f of [196, 247]) tone(f, 'sawtooth', 0.08, 0.06 * vol, 0.7, { pan });
}
function sfxSqueak(pan, vol) {
  if (vol < 0.03) return;
  const f = 1700 + Math.random() * 700;
  tone(f, 'triangle', 0.008, 0.12 * vol, 0.07, { pan, to: f * 1.7 });
  tone(f * 1.5, 'sine', 0.005, 0.05 * vol, 0.05, { pan, to: f * 2.2 });
}
function sfxHit() {
  noise('lowpass', 900, 0.7, 0.005, 0.9, 0.5);
  tone(70, 'sine', 0.005, 0.8, 0.6, { to: 38 });
  noise('bandpass', 2400, 3, 0.01, 0.25, 0.25, { delay: 0.05 });
}
function sfxWhoosh() { noise('bandpass', 300, 1.2, 0.25, 0.22, 0.6, { to: 1400 }); }
function sfxChime() { tone(659, 'sine', 0.01, 0.25, 1.6); tone(988, 'sine', 0.01, 0.2, 1.8, { delay: 0.35 }); }
function sfxHeart(vol) {
  tone(58, 'sine', 0.008, 0.7 * vol, 0.16, { to: 40 });
  tone(52, 'sine', 0.008, 0.5 * vol, 0.18, { to: 36, delay: 0.24 });
}
function sfxWhisper(pan, vol) {
  for (let i = 0; i < 5; i++) noise('bandpass', 2200 + Math.random() * 1800, 6, 0.05, 0.12 * vol, 0.18 + Math.random() * 0.2, { pan, delay: i * 0.14 + Math.random() * 0.06 });
  tone(310, 'sine', 0.4, 0.05 * vol, 1.1, { pan, to: 290 });
}
function sfxSting() {
  for (const f of [880, 932, 1245, 1319]) tone(f, 'sawtooth', 0.01, 0.07, 0.9, { to: f * 0.94 });
  noise('highpass', 3000, 0.7, 0.005, 0.4, 0.5);
  tone(55, 'sine', 0.01, 0.6, 1.0, { to: 30 });
}
function sfxCreak() {
  const f = 120 + Math.random() * 90;
  tone(f, 'sawtooth', 0.15, 0.025, 0.5, { to: f * 0.7 });
}
function sfxScream() {
  const c = AUD.ctx; if (!c) return;
  const t = c.currentTime, end = SK.SCARE_TIME;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(1.0, t + 0.02);
  out.gain.setValueAtTime(1.0, t + end - 0.4);
  out.gain.exponentialRampToValueAtTime(0.0001, t + end);
  const shaper = c.createWaveShaper(); shaper.curve = distCurve(300);
  shaper.connect(out); out.connect(AUD.master);
  const vib = c.createOscillator(); vib.frequency.value = 13;
  const vibAmt = c.createGain(); vibAmt.gain.value = 45;
  vib.connect(vibAmt); vib.start(t); vib.stop(t + end);
  for (const f of [290, 307, 436, 581, 870]) {
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.3, t + end * 0.8);
    vibAmt.connect(o.frequency);
    const g = c.createGain(); g.gain.value = 0.2;
    o.connect(g).connect(shaper); o.start(t); o.stop(t + end);
  }
  const s = c.createBufferSource(); s.buffer = AUD.white; s.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(4200, t + end);
  const ng = c.createGain(); ng.gain.value = 0.9;
  s.connect(f).connect(ng).connect(shaper); s.start(t); s.stop(t + end);
  tone(45, 'sine', 0.01, 1.0, 1.2, { to: 25 });
}

// Called every frame: heartbeat, drone and creaks follow how close Maren is.
function audioTick(dt, stage) {
  const c = AUD.ctx; if (!c) return;
  if (AUD.drone) AUD.drone.gain.setTargetAtTime(stage >= 3 ? (stage - 2) * 0.05 : 0, c.currentTime, 0.6);
  AUD.nextBeat -= dt;
  if (stage >= 2 && AUD.nextBeat <= 0) {
    sfxHeart(0.5 + 0.2 * (stage - 2));
    AUD.nextBeat = [9, 9, 1.25, 0.85, 0.55][stage];
  }
  AUD.nextCreak -= dt;
  if (AUD.nextCreak <= 0) { sfxCreak(); AUD.nextCreak = 5 + Math.random() * 7; }
}
