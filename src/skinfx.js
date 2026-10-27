// Animated flair for rare skins. Every Mate, Captain and Admiral skin has an effect, drawn on its
// 3D ship (third person and crewmates), on your deck in first person, and in its crate preview.
//
//   glow      a soft halo that breathes, and its reflection on the water    (Mate default)
//   flow      paint that flows along the hull and sails                     (Captain default)
//   sparkle   twinkling motes drifting round the rig, plus a gold sheen     (Admiral, always added)
// and some skins have their own:
//   aurora    colour-cycling paint      ghost   flickering, see-through, with green wisps
//   electric  lightning crackles        ember   sparks rising off the hull
//   frost     icy glints                lantern a warm, flickering glow
//   wisp      orbs circling the masts   void    a dark aura with cold sparks

const FX_BY_SKIN = {
  aurora: 'aurora', ghost: 'ghost', b_dutchman: 'ghost', drowned: 'ghost', c_bolt: 'electric',
  maren: 'lantern', witch: 'wisp', c_sunset: 'ember', b_spice: 'ember', wrecker: 'ember', wreckers: 'ember',
  b_ice: 'frost', abyss: 'void', selkie: 'flow', c_coral: 'flow', knockwood: 'ember',
  shoal: 'frost', siren: 'wisp', portal: 'void', lavaforged: 'ember', c_echo: 'ghost', c_kite: 'ember', c_aurora: 'aurora',
  b_whirl: 'flow', b_moth: 'ember', b_cyclops: 'lantern',
};
function skinFx(skin) {
  if (!skin || !skin.rarity) return null;
  const tier = skinTier(skin);
  if (tier < 3) return null;
  return FX_BY_SKIN[skin.id] || (tier >= 5 ? 'sparkle' : tier === 4 ? 'flow' : 'glow');
}
function fxColour(skin, fx, t) {
  if (fx === 'aurora') return 'hsl(' + Math.round((t * 50) % 360) + ',95%,62%)';
  if (fx === 'ghost') return '#8affc8';
  if (fx === 'electric') return '#b8e4ff';
  if (fx === 'ember') return '#ff8a3c';
  if (fx === 'frost') return '#d8f2ff';
  if (fx === 'void') return '#8a5cff';
  if (fx === 'lantern') return skin.lantern || '#ffcf86';
  if (fx === 'wisp') return '#c78aff';
  if (skinTier(skin) >= 5) return '#ffd34d';
  return skin.rail;
}
// a soft radial glow in screen space ('lighter' so it adds light)
function fxGlow(x, y, r, col, a) {
  if (r < 1 || a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a);
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  ctx.restore();
}
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------- on a 3D ship ----------
// called by drawShip3D: `P(u, w, z)` projects a point on the ship, Lh / B / Zd / mastH are its size
function shipFxBefore(skin, P, Lh, B, Zd, mastH) {
  const fx = skinFx(skin); if (!fx || reduceMotion && fx !== 'glow') return;
  const t = g.t, col = fxColour(skin, fx, t);
  const c = P(0, 0, Zd * 0.5); if (!c) return;
  const r = Math.max(6, Lh * 1.5 * c.s);
  const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
  const strength = { glow: 0.35, flow: 0.3, sparkle: 0.4, aurora: 0.45, ghost: 0.5, electric: 0.3, ember: 0.35, frost: 0.35, void: 0.5, lantern: 0.55, wisp: 0.4 }[fx] || 0.3;
  fxGlow(c.x, c.y, r * (fx === 'lantern' ? 1.3 : 1), col, strength * pulse * (fx === 'lantern' ? 0.8 + 0.2 * Math.random() : 1));
  // its light on the water around the hull
  const w = P(0, 0, 0);
  if (w) waterGlow(w.x, w.y, r, col, pulse, fx);
}
// light on the water: a soft pool fading out at the edges, a broken shimmer of reflected streaks
// below the ship that dance with the waves, and slow rings spreading out from the hull
function waterGlow(x, y, r, col, pulse, fx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rx = r * 1.1, ry = Math.max(3, r * 0.22);
  // the pool: a radial gradient squashed flat onto the water
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, col); gr.addColorStop(0.45, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.16 * pulse; ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.28); ctx.fill();
  ctx.restore();
  if (!reduceMotion) {
    // shimmering reflection: little glints scattered over the pool, flickering with the swell
    ctx.fillStyle = col;
    const n = 34, t = g.t;
    for (let i = 0; i < n; i++) {
      const ang = hash(i, 21) * 6.28, d = Math.sqrt(hash(i, 22));
      const gx = x + Math.cos(ang) * rx * d + Math.sin(t * 1.3 + i) * rx * 0.03, gy = y + Math.sin(ang) * ry * d;
      const tw = Math.sin(t * (2.5 + hash(i, 23) * 3) + i * 1.9);
      if (tw < 0.25) continue;
      const len = Math.max(2, r * 0.07 * (1 - d * 0.5)) * tw;
      ctx.globalAlpha = (1 - d * 0.7) * 0.6 * tw * pulse;
      ctx.fillRect(gx - len / 2, gy, len, 1.5);
    }
    // ripple rings spreading out from the hull
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, r * 0.006);
    for (let i = 0; i < 3; i++) {
      const life = (t * 0.35 + i / 3) % 1;
      ctx.globalAlpha = (1 - life) * (1 - life) * 0.22 * pulse;
      ctx.beginPath(); ctx.ellipse(x, y, rx * (0.4 + life * 0.9), ry * (0.4 + life * 0.9), 0, 0, 6.28); ctx.stroke();
    }
  }
  ctx.restore();
}

// flowing paint along one hull face (i = station index, 0 at the stern): a wave of colour travelling aft
function hullFlowAlpha(skin, i) {
  const fx = skinFx(skin); if (!fx || reduceMotion) return 0;
  if (!['flow', 'aurora', 'sparkle', 'ember', 'electric', 'void'].includes(fx)) return 0;
  return Math.max(0, Math.sin(g.t * 3 + i * 1.1)) * (fx === 'flow' || fx === 'aurora' ? 0.75 : 0.45);
}
// how far the sail stripes have scrolled up the sail (0..1), for flowing skins
function sailFlow(skin) {
  const fx = skinFx(skin);
  return fx && !reduceMotion && ['flow', 'aurora', 'sparkle'].includes(fx) ? (g.t * 0.12) % 1 : 0;
}
function shipFxAfter(skin, P, Lh, B, Zd, mastH, ghostAlpha) {
  const fx = skinFx(skin); if (!fx || reduceMotion) return;
  const t = g.t, col = fxColour(skin, fx, t), tier = skinTier(skin);
  const top = P(0, 0, Zd + mastH), base = P(0, 0, Zd); if (!top || !base) return;
  const s = base.s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // twinkling motes round the rig (admirals always, frost and void too)
  if (tier >= 5 || fx === 'sparkle' || fx === 'frost' || fx === 'void') {
    const n = fx === 'frost' ? 14 : 18;
    for (let i = 0; i < n; i++) {
      const u = (hash(i, 1) * 2 - 1) * Lh * 0.9, w = (hash(i, 2) * 2 - 1) * B * 1.6;
      const z = Zd + hash(i, 3) * mastH * 0.95 + Math.sin(t * 0.8 + i) * 0.6;
      const p = P(u, w, z); if (!p) continue;
      const tw = Math.max(0, Math.sin(t * (2 + hash(i, 4) * 3) + i * 2.3));
      if (tw < 0.2) continue;
      const k = Math.max(1, 0.35 * p.s) * tw;
      ctx.globalAlpha = tw;
      ctx.fillStyle = fx === 'void' ? (i % 2 ? '#7fe8ff' : '#b48cff') : fx === 'frost' ? '#ffffff' : '#fff0b0';
      ctx.fillRect(p.x - k * 1.6, p.y - k * 0.3, k * 3.2, k * 0.6);
      ctx.fillRect(p.x - k * 0.3, p.y - k * 1.6, k * 0.6, k * 3.2);
    }
  }
  // embers rising off the hull and drifting downwind
  if (fx === 'ember') {
    for (let i = 0; i < 16; i++) {
      const life = (t * 0.45 + hash(i, 5)) % 1;
      const p = P((hash(i, 6) * 2 - 1) * Lh * 0.8 - life * 3, (hash(i, 7) * 2 - 1) * B, Zd + life * mastH * 0.9); if (!p) continue;
      ctx.globalAlpha = (1 - life) * 0.9;
      ctx.fillStyle = life < 0.4 ? '#ffd27a' : '#ff6a2a';
      const k = Math.max(1, 0.22 * p.s);
      ctx.fillRect(p.x - k / 2, p.y - k / 2, k, k);
    }
  }
  // ghostly wisps curling up from the deck
  if (fx === 'ghost' || fx === 'wisp') {
    for (let i = 0; i < (fx === 'wisp' ? 5 : 8); i++) {
      let p;
      if (fx === 'wisp') {   // orbs circling the masts
        const a = t * 0.9 + i * 1.26;
        p = P(Math.cos(a) * Lh * 0.6, Math.sin(a) * B * 1.8, Zd + mastH * (0.35 + 0.1 * Math.sin(t + i)));
      } else {
        const life = (t * 0.3 + hash(i, 8)) % 1;
        p = P((hash(i, 9) * 2 - 1) * Lh * 0.7 + Math.sin(t + i) * 1.5, (hash(i, 10) * 2 - 1) * B, Zd + life * mastH * 0.7);
        ctx.globalAlpha = Math.sin(life * Math.PI) * 0.6;
      }
      if (!p) continue;
      if (fx === 'wisp') ctx.globalAlpha = 0.85;
      fxGlow(p.x, p.y, Math.max(3, 0.9 * p.s), col, fx === 'wisp' ? 0.9 : ctx.globalAlpha);
    }
  }
  // lightning crackling down the rig now and then
  if (fx === 'electric') {
    const flash = Math.floor(t * 5);
    if (hash(flash, 11) < 0.35) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = Math.max(1, 0.12 * s);
      ctx.beginPath();
      let x = top.x, y = top.y; ctx.moveTo(x, y);
      const steps = 7, dx = (base.x - top.x) / steps, dy = (base.y - top.y) / steps;
      for (let k = 1; k <= steps; k++) { x = top.x + dx * k + (hash(flash * 9 + k, 12) - 0.5) * 2.4 * s; y = top.y + dy * k; ctx.lineTo(x, y); }
      ctx.stroke();
      fxGlow(top.x, top.y, Math.max(6, 2.5 * s), '#a8dcff', 0.6);
    }
  }
  // a sheen of light sweeping across the ship on admirals and auroras
  if (tier >= 5 || fx === 'aurora') {
    const k = ((t * 0.35) % 1.6) - 0.3;
    if (k > 0 && k < 1) {
      const p = P(Lh * (1 - 2 * k), 0, Zd + mastH * 0.45); if (p) fxGlow(p.x, p.y, Math.max(8, mastH * 0.55 * p.s), fx === 'aurora' ? col : '#fff2c0', 0.25);
    }
  }
  ctx.restore();
}

// ---------- on your deck, first person ----------
function drawDeckFx(skin, tipY, DW, railT) {
  const fx = skinFx(skin); if (!fx || reduceMotion) return;
  const t = g.t, col = fxColour(skin, fx, t), tier = skinTier(skin);
  const rails = [-1, 1].map(sd => ({ x0: cx + sd * DW, y0: H - 4, x1: cx + sd * 6, y1: tipY + 2 }));
  const at = (r, k) => ({ x: r.x0 + (r.x1 - r.x0) * k, y: r.y0 + (r.y1 - r.y0) * k });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // a breathing glow along the rails
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
  ctx.globalAlpha = 0.22 * pulse * (fx === 'lantern' ? 1.5 : 1);
  ctx.strokeStyle = col; ctx.lineWidth = railT * 1.8; ctx.lineCap = 'round';
  for (const r of rails) { ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.lineTo(r.x1, r.y1); ctx.stroke(); }
  // flowing paint: bright dashes running up the rails to the bow
  if (['flow', 'aurora', 'sparkle', 'electric', 'void'].includes(fx)) {
    ctx.lineWidth = railT * 0.5;
    for (const r of rails) for (let i = 0; i < 3; i++) {
      const k = ((t * 0.35 + i / 3) % 1), a = at(r, k), b = at(r, Math.min(1, k + 0.08));
      ctx.globalAlpha = 0.8 * Math.sin(k * Math.PI);
      ctx.strokeStyle = fx === 'aurora' ? fxColour(skin, fx, t + i * 2) : col;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  // sparkles twinkling along the rails
  if (tier >= 5 || ['sparkle', 'frost', 'void'].includes(fx)) {
    for (let i = 0; i < 14; i++) {
      const r = rails[i % 2], p = at(r, hash(i, 1)), tw = Math.max(0, Math.sin(t * (2 + hash(i, 2) * 3) + i));
      if (tw < 0.3) continue;
      const k = (2 + hash(i, 3) * 3) * tw;
      ctx.globalAlpha = tw;
      ctx.fillStyle = fx === 'void' ? '#9ae8ff' : fx === 'frost' ? '#ffffff' : '#fff0b0';
      ctx.fillRect(p.x - k * 1.5, p.y - railT * 0.6 - k * 0.25, k * 3, k * 0.5);
      ctx.fillRect(p.x - k * 0.25, p.y - railT * 0.6 - k * 1.5, k * 0.5, k * 3);
    }
  }
  // embers lifting off the rails
  if (fx === 'ember') {
    for (let i = 0; i < 18; i++) {
      const life = (t * 0.5 + hash(i, 4)) % 1, r = rails[i % 2], p = at(r, hash(i, 5));
      ctx.globalAlpha = (1 - life) * 0.9; ctx.fillStyle = life < 0.4 ? '#ffd27a' : '#ff6a2a';
      ctx.fillRect(p.x + Math.sin(t * 2 + i) * 8, p.y - life * H * 0.25, 3, 3);
    }
  }
  // ghost and wisp: pale lights drifting over the deck
  if (fx === 'ghost' || fx === 'wisp') {
    for (let i = 0; i < 5; i++) {
      const a = t * 0.5 + i * 1.3, x = cx + Math.sin(a) * DW * 0.45, y = tipY + (H - tipY) * (0.35 + 0.25 * Math.sin(a * 1.3 + i));
      fxGlow(x, y, 18 + 8 * Math.sin(t * 2 + i), col, 0.35);
    }
  }
  // lightning along a rail now and then
  if (fx === 'electric') {
    const flash = Math.floor(t * 5);
    if (hash(flash, 6) < 0.3) {
      const r = rails[flash % 2];
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r.x0, r.y0 - railT);
      for (let k = 1; k <= 8; k++) { const p = at(r, k / 8); ctx.lineTo(p.x + (hash(flash + k, 7) - 0.5) * 18, p.y - railT - hash(flash + k, 8) * 14); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- in a crate preview (SVG, animated with SMIL so it moves in the menus too) ----------
function previewFx(svg, skin, el, geo) {
  const fx = skinFx(skin); if (!fx) return;
  const NS = 'http://www.w3.org/2000/svg', col = fx === 'aurora' ? '#7affd4' : fxColour(skin, fx, 0), tier = skinTier(skin);
  const anim = (node, attrs) => { const a = document.createElementNS(NS, 'animate'); for (const k in attrs) a.setAttribute(k, attrs[k]); node.appendChild(a); return node; };
  // glow behind the ship, breathing
  const halo = document.createElementNS(NS, 'ellipse');
  for (const [k, v] of Object.entries({ cx: 58, cy: 44, rx: 46, ry: 30, fill: col, opacity: 0.18 })) halo.setAttribute(k, v);
  halo.setAttribute('filter', 'url(#fxblur)');
  anim(halo, { attributeName: 'opacity', values: '0.08;0.3;0.08', dur: fx === 'lantern' ? '1.1s' : '2.6s', repeatCount: 'indefinite' });
  if (fx === 'aurora') anim(halo, { attributeName: 'fill', values: '#7affd4;#7ab0ff;#d27aff;#ff7ab8;#7affd4', dur: '6s', repeatCount: 'indefinite' });
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = '<filter id="fxblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>';
  svg.insertBefore(defs, svg.firstChild);
  svg.insertBefore(halo, defs.nextSibling);
  // flowing paint: bright dashes running along the rail and the hull stripe, bow to stern
  if (geo && (['flow', 'aurora', 'sparkle', 'electric', 'ember', 'void'].includes(fx) || tier >= 4)) {
    const lines = [[geo.deckY, geo.deckY - 3, 2.2], [geo.deckY + 4, geo.deckY + 1.5, 1.4]];
    for (const [y0, y1, w] of lines) {
      const l = document.createElementNS(NS, 'line');
      for (const [k, v] of Object.entries({ x1: geo.bowX, y1: y1, x2: geo.sternX, y2: y0, stroke: tier >= 5 ? '#fff0b0' : col, 'stroke-width': w, 'stroke-dasharray': '5 9', 'stroke-linecap': 'round', opacity: 0.9 })) l.setAttribute(k, v);
      anim(l, { attributeName: 'stroke-dashoffset', values: '0;-28', dur: fx === 'flow' ? '0.9s' : '1.4s', repeatCount: 'indefinite' });
      if (fx === 'aurora') anim(l, { attributeName: 'stroke', values: '#7affd4;#7ab0ff;#d27aff;#ff7ab8;#7affd4', dur: '4s', repeatCount: 'indefinite' });
      svg.appendChild(l);
    }
  }
  // twinkles
  if (tier >= 5 || ['sparkle', 'frost', 'void', 'wisp', 'ghost', 'ember'].includes(fx)) {
    const n = fx === 'ember' ? 7 : 6;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(NS, 'circle');
      const x = 20 + hash(i, 1) * 80, y = 10 + hash(i, 2) * 50;
      for (const [k, v] of Object.entries({ cx: x, cy: y, r: fx === 'wisp' || fx === 'ghost' ? 2.4 : 1.3, fill: fx === 'ember' ? '#ff9a4a' : fx === 'void' ? '#9ae8ff' : fx === 'ghost' || fx === 'wisp' ? col : '#fff4c0', opacity: 0 })) c.setAttribute(k, v);
      anim(c, { attributeName: 'opacity', values: '0;1;0', dur: (1.2 + hash(i, 3) * 1.6).toFixed(2) + 's', begin: (hash(i, 4) * 2).toFixed(2) + 's', repeatCount: 'indefinite' });
      if (fx === 'ember' || fx === 'ghost') anim(c, { attributeName: 'cy', values: (y + 14) + ';' + (y - 10), dur: '2.4s', begin: (hash(i, 4) * 2).toFixed(2) + 's', repeatCount: 'indefinite' });
      svg.appendChild(c);
    }
  }
  // lightning flicker
  if (fx === 'electric') {
    const bolt = document.createElementNS(NS, 'path');
    for (const [k, v] of Object.entries({ d: 'M62 10 L56 24 L63 26 L55 44', stroke: '#dff4ff', 'stroke-width': 1.6, fill: 'none', opacity: 0 })) bolt.setAttribute(k, v);
    anim(bolt, { attributeName: 'opacity', values: '0;0;1;0;0;0.8;0', dur: '2s', repeatCount: 'indefinite' });
    svg.appendChild(bolt);
  }
  // ghosts fade in and out
  if (fx === 'ghost') anim(svg, { attributeName: 'opacity', values: '1;0.55;1', dur: '3s', repeatCount: 'indefinite' });
  if (el) el.classList.add('fx-' + fx);
}
