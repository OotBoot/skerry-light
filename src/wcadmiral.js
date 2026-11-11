// Wreckers' Night: the Admiral weapon skins, alive.
//
// The six Admiral finishes from the Gunsmith's Crate (src/wcrates.js) each get a finish of their own that moves (and the
// six Gannet's Locker finishes share a seventh, a step above them: the locker theme at the end), in
// the manner of the Lighthouse's reforged look (src/zmpap.js) but each in its own theme and colours:
//   pb_skerry     The Skerry Light     the Light's beam sweeping along the gun, and gold filigree lit as it passes
//   bb_charybdis  Mouth of Charybdis   a whirlpool of violet and gold twisting down the barrel into the bell
//   la_plimsoll   Plimsoll's Eye       blue sea-glass with water caustics running over it, a glint that travels
//                                      the barrel, and an eye in the telescope's eyepiece that opens and looks
//   hp_leviathan  Golden Leviathan     molten gold scales with glowing seams, rippling down the gun
//   cl_lastlamp   The Last Lamp        a lamp flame flickering up through the blade, with embers rising off it
//   av_ninth      The Ninth Wave       foam-crested waves rolling along the gun, spray flying, every ninth one bigger
//
// How: one fragment shader (WCA_FRAG), put into the weapon's own Phong materials with one onBeforeCompile function
// (WCA_OBC); each theme is a define (WCA_TH), so it compiles once per theme to only its own branch, and every
// material wearing that theme shares the one program, with its own uniforms (a few colours). It adds to
// the emissive light (and darkens the base a little, so the light shows), laid out in the weapon's own space so it
// stays put as the gun moves. wcaSkin(wp, id, plain) puts it on or takes it off a build ({ root, M }); fpsgun.js calls
// it for the gun in your hands and fpsbody.js for your figure over the shoulder.
//
// The Lighthouse's reforging (zmpSkinFor) always wins: while a weapon is in ZMP_SK this leaves its materials alone,
// and when it comes back out (zmpSkinOff strips the shader and the meshes' hooks) this sees its shader is gone and
// puts it back. With reduce motion it holds still. The crate card's pictures move too: wcaSvg (from wcPreview).

// per skin: the theme (the shader's branch), its colours [a, b, c], how much of the base colour stays (dim), its
// brightness (k), and how much of the shine stays (sp: a bright polished face would wash the light out)
const WCA_THEMES = {
  pb_skerry:    { th: 0, a: '#fff3c4', b: '#ffd34d', c: '#ffa22e', dim: 0.5, k: 0.9, sp: 0.6 },
  bb_charybdis: { th: 1, a: '#8a5cff', b: '#ffd060', c: '#2a0c66', dim: 0.26, k: 0.95, sp: 0.45 },
  la_plimsoll:  { th: 2, a: '#5fd3ff', b: '#e8fdff', c: '#1b6f96', dim: 0.72, k: 1.0, sp: 0.85 },
  hp_leviathan: { th: 3, a: '#ffb020', b: '#fff0a0', c: '#8a4004', dim: 0.45, k: 0.75, sp: 0.5 },
  cl_lastlamp:  { th: 4, a: '#ffc23a', b: '#fff3c4', c: '#ff5a0a', dim: 0.22, k: 1.1, sp: 0.12 },
  av_ninth:     { th: 5, a: '#1f7fe0', b: '#f0faff', c: '#ffe08a', dim: 0.18, k: 1.1, sp: 0.25 },
  // [pirate tokens] the Gannet's Locker's finishes (src/zmegg.js) all share one theme, a step above the Admiral's: the
  // drowned crew's cold green fire, the hoard's doubloons glinting in the metal, and the locker's pulse; v is each
  // weapon's own touch (more coins, deeper water)
  pb_jolly:     { th: 6, v: 0, a: '#3ee0b4', b: '#ffe9a8', c: '#06302a', dim: 0.4, k: 0.8, sp: 0.3 },
  bb_maw:       { th: 6, v: 1, a: '#3ee0b4', b: '#ffd34d', c: '#04261f', dim: 0.28, k: 1.05, sp: 0.3 },
  la_fathom:    { th: 6, v: 2, a: '#5affd0', b: '#ffe07a', c: '#0a3a44', dim: 0.4, k: 1.0, sp: 0.5 },
  hp_due:       { th: 6, v: 3, a: '#3ee0b4', b: '#ffd34d', c: '#06302a', dim: 0.3, k: 1.0, sp: 0.35 },
  cl_doubloon:  { th: 6, v: 4, a: '#3ee0b4', b: '#ffd34d', c: '#04261f', dim: 0.12, k: 0.9, sp: 0.04 },
  av_eight:     { th: 6, v: 5, a: '#5affb8', b: '#ffd34d', c: '#062a22', dim: 0.25, k: 1.05, sp: 0.3 },
  // [verity] Verity's Wardrobe (src/verityfx.js) all share an eighth theme: his yellow, his smiling faces set all over the
  // gun, blinking in their own time and grinning wider, and his giggle running down it; v is each weapon's own touch
  // (0 the pepperbox's barrels each a face; 1 a great grin round the blunderbuss's bell; 2 his eye in the longarm's
  // scope; 3 his tongue down the harpoon gun; 4 a row of teeth along the cutlass's edge; 5 faces that roll round the avtomat)
  vy_pb:        { th: 7, v: 0, a: '#ffe24a', b: '#fff6c8', c: '#5a4a00', dim: 0.55, k: 0.95, sp: 0.4 },
  vy_bb:        { th: 7, v: 1, a: '#ffe24a', b: '#fff6c8', c: '#5a4a00', dim: 0.5, k: 0.95, sp: 0.4 },
  vy_la:        { th: 7, v: 2, a: '#ffe24a', b: '#fff6c8', c: '#5a4a00', dim: 0.55, k: 0.9, sp: 0.5 },
  vy_hp:        { th: 7, v: 3, a: '#ffe24a', b: '#fff6c8', c: '#5a4a00', dim: 0.5, k: 0.95, sp: 0.4 },
  vy_cl:        { th: 7, v: 4, a: '#ffe24a', b: '#fff6c8', c: '#5a4a00', dim: 0.4, k: 0.9, sp: 0.1 },
  vy_av:        { th: 7, v: 5, a: '#ffe24a', b: '#fff6c8', c: '#5a4a00', dim: 0.5, k: 0.95, sp: 0.4 },
};
// per weapon, in its root's space: [length along y (1) or z (0), where its length starts, where it ends (the
// muzzle or point), the axis's middle across (x), and up (y, or z for the cutlass)]
const WCA_SPAN = {
  pepperbox:   [0, 0.06, -0.29, 0, 0.035],
  blunderbuss: [0, 0.39, -0.54, 0, 0.05],
  longarm:     [0, 0.4, -0.8, 0, 0.05],
  harpoon:     [0, 0.37, -0.5, 0, 0.055],
  cutlass:     [1, -0.1, 0.45, 0.004, 0],
  avtomat:     [0, 0.36, -0.665, 0, 0.035],
};
// each slot: [how much it shows, how much its edges glow]
const WCA_ROLE = { iron: [1, 1], blade: [1.1, 1.1], dark: [0.85, 0.9], brass: [1, 1], wood: [0.55, 0.6], accent: [1.2, 1.2] };
const WCA_SKIP = new Set(['bore', 'lens', 'sleeve', 'cuff', 'flesh']);
const WCA_VERT = 'uniform mat4 wcaRoot;\nvarying vec3 wcaP;\n';
const WCA_FRAG = `uniform float wcaT; uniform vec4 wcaK; uniform vec4 wcaS; uniform vec2 wcaO; uniform vec2 wcaR;
uniform vec3 wcaA; uniform vec3 wcaB; uniform vec3 wcaC;
varying vec3 wcaP;
float wcaH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wcaH2(vec2 p) { return wcaH(vec3(p, 1.7)); }
float wcaN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wcaH(i), wcaH(i + vec3(1, 0, 0)), f.x), mix(wcaH(i + vec3(0, 1, 0)), wcaH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(wcaH(i + vec3(0, 0, 1)), wcaH(i + vec3(1, 0, 1)), f.x), mix(wcaH(i + vec3(0, 1, 1)), wcaH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float wcaF(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * wcaN(p); p = p * 2.07 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
// a sparkle: a cell lit now and then, a soft point in it, twinkling
float wcaStar(vec3 p, float t, float dens) {
  vec3 c = floor(p), f = fract(p); float h = wcaH(c);
  if (h < dens) return 0.0;
  vec3 o = vec3(wcaH(c + 3.1), wcaH(c + 7.7), wcaH(c + 1.3)) * 0.6 + 0.2;
  float d = length(f - o), tw = max(0.0, sin(t * (1.5 + h * 4.0) + h * 60.0));
  return pow(max(0.0, 1.0 - d * 2.4), 5.0) * tw * tw;
}
// light caught in moving water (after the well-known tileable caustic)
float wcaCaus(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0, i = p; float c = 1.0;
  for (int n = 0; n < 3; n++) { float tt = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005))); }
  c /= 3.0; c = 1.17 - pow(c, 1.4); return clamp(pow(abs(c), 8.0), 0.0, 2.0);
}
vec3 wcaFire(vec3 n, vec3 v, inout vec3 dif) {
  float t = wcaT; const float th = float(WCA_TH);   // (a constant: each theme compiles to its own branch alone)
  // along the gun (0 at the breech or the hilt, 1 at the muzzle or the point), round it, and across it
  float ax = wcaS.x > 0.5 ? wcaP.y : wcaP.z;
  float s = (ax - wcaS.y) / (wcaS.z - wcaS.y);
  vec2 cr = wcaS.x > 0.5 ? vec2(wcaP.x - wcaO.x, wcaP.z - wcaO.y) : vec2(wcaP.x - wcaO.x, wcaP.y - wcaO.y);
  float ang = atan(cr.y, cr.x), rad = length(cr);
  float rim = pow(1.0 - abs(dot(n, v)), 2.0);
  vec3 col = vec3(0.0);
  if (th < 0.5) {
    // ---- the Skerry Light: the beam comes round, sweeps the gun from breech to muzzle, and goes on
    float b = fract(t * 0.32) * 2.2 - 0.6;
    float d = (s - b) / 0.05, beam = exp(-d * d), halo = exp(-d * d * 0.06);
    float flash = exp(-pow((fract(t * 0.32) - 0.38) * 9.0, 2.0));   // the moment it looks straight at you
    // gold filigree: scrolls and tendrils worked into the metal
    vec3 q = wcaP * 150.0;
    float c1 = sin(q.z + 2.2 * sin(q.y * 0.55 + q.x * 0.4)) * cos(q.y - 1.7 * cos(q.z * 0.5 + q.x * 0.3));
    float fil = 1.0 - smoothstep(0.0, 0.16, abs(c1));
    fil *= 0.55 + 0.45 * smoothstep(0.35, 0.65, wcaN(wcaP * 60.0 + 3.0));
    float shim = 0.55 + 0.45 * sin(t * 1.3 + s * 9.0);
    col += wcaB * fil * (0.3 * shim + beam * 1.6 + halo * 0.3);
    col += wcaA * (beam * 0.7 + pow(beam, 6.0) * 0.9) + wcaC * halo * 0.12;
    col += wcaA * flash * 0.35;
    col += wcaA * wcaStar(wcaP * 140.0, t * 2.0, 0.86) * (1.2 + beam * 3.0);
    col += mix(wcaB, wcaA, beam) * rim * (0.35 + beam * 1.2) * wcaR.y;
  } else if (th < 1.5) {
    // ---- Mouth of Charybdis: spiral arms twisting round the barrel, tighter and faster towards the bell
    float pull = s * s * 22.0 + s * 6.0;
    float w = wcaF(vec3(s * 6.0, ang * 0.9, t * 0.15)) * 3.0;
    float arm = sin(ang * 3.0 + pull - t * 2.4 + w), arm2 = sin(ang * 5.0 - pull * 1.3 + t * 1.7 + w * 0.7);
    float sw = smoothstep(0.35, 1.0, arm), thread = 1.0 - smoothstep(0.0, 0.1, abs(arm2 - 0.6));
    float deep = smoothstep(0.2, 1.0, s);
    vec3 vio = mix(wcaC, wcaA, sw) * (0.4 + 0.9 * sw) * (0.55 + 0.7 * deep);
    col += vio + wcaB * thread * (0.55 + deep * 0.8) * (0.6 + 0.4 * sin(t * 3.0 + ang * 2.0));
    // rings drawn in down the throat
    float ring = pow(max(0.0, sin(s * 40.0 - t * 5.0)), 10.0) * deep;
    col += wcaB * ring * 0.9;
    col += wcaB * wcaStar(vec3(s * 30.0 - t * 1.5, ang * 6.0, rad * 200.0), t * 2.5, 0.88) * 1.8;
    col += mix(wcaA, wcaB, 0.5 + 0.5 * sin(t * 1.1)) * rim * 0.8 * wcaR.y;
  } else if (th < 2.5) {
    // ---- Plimsoll's Eye: light through moving water on sea-glass, frosted and blue
    vec2 uv = vec2(wcaP.z * 9.0 + wcaP.x * 4.0, wcaP.y * 9.0 + wcaP.x * 6.0);
    float c1 = wcaCaus(uv, t * 0.55), c2 = wcaCaus(uv * 1.7 + 3.1, t * 0.4 + 2.0);
    float frost = wcaF(wcaP * 90.0);
    dif = mix(dif, dif * vec3(0.55, 0.85, 1.0), 0.5);
    col += wcaC * (0.18 + frost * 0.22) + wcaA * (c1 * 0.75 + c2 * 0.35) + wcaB * pow(c1, 2.0) * 0.6;
    // a glint that runs the length of the barrel now and then
    float g = fract(t * 0.22) * 1.6 - 0.3, gd = (s - g) / 0.02;
    col += wcaB * exp(-gd * gd) * smoothstep(0.03, 0.0, rad) * 2.5;
    // the eye in the telescope's eyepiece: an iris of sea-blue round a dark pupil, blinking, looking about
    vec2 e = vec2(wcaP.x, wcaP.y - 0.098);
    float ez = smoothstep(0.012, 0.0, abs(wcaP.z - 0.06));
    float blink = smoothstep(0.0, 0.08, abs(fract(t * 0.18) - 0.5) - 0.02);
    e.x -= 0.0025 * sin(t * 0.7); e.y -= 0.0015 * sin(t * 0.43 + 1.0);
    float er = length(e), ea = atan(e.y, e.x);
    float iris = smoothstep(0.0145, 0.012, er) * smoothstep(0.004, 0.0055, er);
    float streak = 0.6 + 0.4 * sin(ea * 22.0 + wcaN(vec3(ea * 4.0, er * 600.0, 1.0)) * 4.0);
    float lid = smoothstep(0.0, 0.002, 0.0145 * blink - abs(e.y));
    col += ez * lid * (wcaA * iris * streak * 2.4 + wcaB * smoothstep(0.0018, 0.0, length(e - vec2(0.003, 0.003))) * 4.0 + wcaB * smoothstep(0.0145, 0.0135, er) * smoothstep(0.012, 0.0135, er) * 1.5);
    col += wcaB * wcaStar(wcaP * 130.0, t * 1.6, 0.9) * 2.0;
    col += mix(wcaA, wcaB, 0.3) * rim * 0.75 * wcaR.y;
  } else if (th < 3.5) {
    // ---- Golden Leviathan: scales laid along the gun, overlapping like a fish's, molten at the seams
    vec2 g = vec2(s * 36.0, ang * 2.6 + wcaP.y * 30.0 * step(0.05, rad));
    float row = floor(g.x); g.y += mod(row, 2.0) * 0.5;
    vec2 f = fract(g) - vec2(0.15, 0.5);
    float d = length(f * vec2(1.0, 1.15));
    float edge = smoothstep(0.36, 0.5, d), dome = 1.0 - smoothstep(0.0, 0.5, d);
    float h = wcaH2(vec2(row, floor(g.y)));
    // a ripple of molten light down the gun, each scale catching it in turn
    float rip = 0.5 + 0.5 * sin(s * 14.0 - t * 2.6 + h * 1.5), rip2 = pow(rip, 6.0);
    float melt = wcaF(vec3(s * 9.0 - t * 0.35, ang, t * 0.1));
    dif *= 0.85 + dome * 0.3;
    col += wcaC * (0.25 + melt * 0.35) + wcaA * dome * (0.25 + rip * 0.45 + h * 0.15);
    col += wcaB * edge * (0.65 + 0.9 * rip2 + 0.4 * melt);
    col += wcaB * wcaStar(vec3(g * 2.0, 1.0), t * 2.2, 0.82) * 1.6;
    col += mix(wcaA, wcaB, rip) * rim * 0.8 * wcaR.y;
  } else if (th < 4.5) {
    // ---- the Last Lamp: a flame burning up through the steel from the hilt, flickering, and embers off it
    float fl = 0.78 + 0.22 * wcaN(vec3(t * 7.0, 0.0, 0.0)) + 0.08 * sin(t * 23.0);
    vec3 q = vec3(wcaP.x * 50.0, wcaP.y * 26.0 - t * 1.8, wcaP.z * 50.0);
    float fire = wcaF(q + wcaF(q * 1.6 + t * 0.4) * 1.4);
    float height = clamp(s, 0.0, 1.0), body = smoothstep(1.15, 0.0, height);
    float flame = smoothstep(0.25 + height * 0.55, 0.85, fire + body * 0.42);
    vec3 fc = mix(wcaC, wcaA, smoothstep(0.2, 0.75, flame));
    fc = mix(fc, wcaB, smoothstep(0.75, 1.0, flame));
    col += fc * (flame * 1.5 + 0.12) * fl;
    col += wcaC * smoothstep(0.6, 0.0, height) * 0.25 * fl;
    // embers drifting up the blade
    vec3 ep = vec3(wcaP.x * 80.0, wcaP.y * 60.0 - t * 2.2, wcaP.z * 80.0 + sin(wcaP.y * 30.0 + t) * 0.4);
    col += mix(wcaC, wcaB, 0.4) * (wcaStar(ep, t * 4.0, 0.84) * 3.0 + wcaStar(ep * 1.7 + 9.0, t * 5.0, 0.86) * 2.0);
    col += mix(wcaC, wcaA, 0.5) * rim * (0.5 + 0.5 * fl) * wcaR.y;
  } else if (th < 5.5) {
    // ---- the Ninth Wave: seas rolling along the gun, each with a breaking crest of foam and spray off it, and every
    // ninth one a great sea, whiter and wider, with gold in its spray
    float wob = sin(cr.x * 70.0 + cr.y * 50.0 + t * 0.9) * 0.18 + (wcaF(vec3(cr.x * 40.0, cr.y * 40.0, s * 6.0 + t * 0.2)) - 0.5) * 0.6;
    float x = s * 8.0 - t * 0.6 + wob, k = floor(x), f = fract(x);
    float big = step(8.0, mod(k + 900.0, 9.0));
    float face = pow(f, 2.0), brk = smoothstep(0.84 - big * 0.14, 0.97, f) * (1.0 - smoothstep(0.97, 1.0, f));
    float foam = smoothstep(0.35, 0.7, wcaF(vec3(s * 50.0 + t * 0.5, cr.x * 60.0, cr.y * 60.0 - t * 0.3)));
    vec3 sea = mix(wcaA * 0.1, wcaA * 1.3, face) + mix(wcaA, wcaB, 0.5) * pow(face, 6.0) * 0.5;
    col += sea * (0.55 + big * 0.35);
    col += wcaB * brk * (0.5 + foam * 1.3) * (1.0 + big * 0.9);
    col += wcaB * foam * face * 0.08;
    // the trough's dark streaks of spindrift
    col += wcaB * smoothstep(0.92, 1.0, sin((s * 60.0 + wob * 8.0) - t * 2.0)) * (1.0 - face) * 0.25;
    vec3 sp = vec3(s * 70.0 - t * 2.5, cr.x * 70.0 - t * 0.6, cr.y * 70.0 + t * 1.4);
    col += mix(wcaB, wcaC, big * 0.6) * wcaStar(sp, t * 3.0, 0.84) * (1.0 + brk * 3.0 + big * 1.5);
    col += mix(wcaA, wcaB, 0.6) * rim * 0.75 * wcaR.y;
  } else if (th < 6.5) {
    // ---- the Gannet's Locker: cold green ghost-fire creeping along the gun, light through deep water over it, gold
    // doubloons set in the metal each catching the light in its own time, bubbles rising, and every four seconds the
    // locker's pulse, a ring of green and gold running from the breech (or hilt) to the muzzle (or point)
    float v = wcaS.w;
    float fl = 0.8 + 0.2 * wcaN(vec3(t * 6.0, v, 0.0));
    vec3 q = vec3(wcaP.x * 46.0, wcaP.y * 46.0 - t * 1.2, wcaP.z * 46.0 + t * 0.6);
    float fire = wcaF(q + wcaF(q * 1.7 - t * 0.3) * 1.3);
    float gf = smoothstep(0.42, 0.85, fire + 0.18 * sin(s * 10.0 - t * 2.0));
    col += mix(wcaC, wcaA, gf) * (gf * 1.0 + 0.06) * fl;
    float cs = wcaCaus(vec2(s * 3.0 + wcaP.x * 5.0, ang * 0.5 + wcaP.y * 6.0), t * 0.45);
    col += wcaA * cs * (abs(v - 2.0) < 0.5 ? 0.55 : 0.2);
    vec2 cg = vec2(s * (v > 3.5 ? 26.0 : 16.0), ang * 1.6 + (wcaS.x > 0.5 ? wcaP.z * 40.0 : 0.0));
    vec2 cf = fract(cg) - 0.5; float ch = wcaH2(floor(cg)), cd = length(cf), on = step(v > 3.5 ? 0.62 : 0.74, ch);
    float coin = (1.0 - smoothstep(0.2, 0.25, cd)) * on, crim = smoothstep(0.15, 0.19, cd) * (1.0 - smoothstep(0.2, 0.25, cd)) * on;
    float glint = pow(max(0.0, sin(t * (1.2 + ch * 2.0) + ch * 40.0)), 8.0);
    col += wcaB * (coin * (0.12 + glint * 1.3) + crim * 0.4);
    float pd = (s - (fract(t * 0.25) * 1.6 - 0.3)) / 0.04, pulse = exp(-pd * pd);
    col += (wcaA * 1.4 + wcaB * 0.6) * pulse * (0.7 + 0.3 * sin(ang * 6.0 + t * 8.0));
    vec3 bp = vec3(wcaP.x * 90.0, wcaP.y * 90.0 - t * 3.0, wcaP.z * 90.0);
    col += mix(wcaA, vec3(1.0), 0.5) * wcaStar(bp, t * 3.0, 0.86) * 2.2;
    col += wcaB * wcaStar(wcaP * 150.0 + 7.0, t * 2.4, 0.9) * (1.5 + pulse * 4.0);
    col += mix(wcaA, wcaB, 0.25 + 0.25 * sin(t * 1.3)) * rim * (0.55 + pulse * 0.8) * wcaR.y;
  } else {
    // ---- [verity] Verity's: his yellow over the metal, his smiling faces set all over it (each in a cell about three
    // centimetres across, laid along the gun and round it), each blinking in its own time and its grin widening, and
    // every three seconds his giggle, a ripple of light, running from the breech (or hilt) to the muzzle (or point)
    float v = wcaS.w, L = abs(wcaS.z - wcaS.y);
    float rl = v > 4.5 ? t * 0.35 : 0.0;   // (the avtomat's faces roll round it)
    vec2 fg = vec2(s * L / 0.032, (ang + rl) * max(rad, 0.012) / 0.032 + (wcaS.x > 0.5 ? wcaP.z * 30.0 : 0.0));
    vec2 c = floor(fg), f = fract(fg) - 0.5; float h = wcaH2(c);
    float on = step(v < 0.5 ? 0.3 : 0.52, h), d = length(f);
    float face = (1.0 - smoothstep(0.34, 0.4, d)) * on;
    float open = smoothstep(0.02, 0.07, abs(fract(t * (0.17 + h * 0.08) + h * 7.0) - 0.5));
    vec2 e1 = (f - vec2(-0.13, 0.09)) / vec2(0.055, mix(0.012, 0.09, open)), e2 = (f - vec2(0.13, 0.09)) / vec2(0.055, mix(0.012, 0.09, open));
    float eye = (1.0 - smoothstep(0.8, 1.1, length(e1))) + (1.0 - smoothstep(0.8, 1.1, length(e2)));
    float gw = 0.19 + 0.05 * sin(t * 1.7 + h * 30.0), md = length(f - vec2(0.0, 0.07));
    float mouth = (1.0 - smoothstep(0.025, 0.05, abs(md - gw))) * step(f.y, 0.0);
    float feat = clamp(eye + mouth, 0.0, 1.0) * face;
    // (each weapon's own: a great grin round the bell, his eye in the scope, his tongue, a row of teeth)
    float sp = 0.0;
    if (v > 0.5 && v < 1.5) { float gr = abs(s - 0.92 - 0.03 * sin(ang * 2.0)); feat = max(feat, (1.0 - smoothstep(0.012, 0.025, gr)) * step(-0.2, -sin(ang))); sp = (1.0 - smoothstep(0.0, 0.05, abs(s - 0.86))) * step(0.5, fract(ang * 4.0 + t)); }
    if (v > 1.5 && v < 2.5) { vec2 e = vec2(wcaP.x, wcaP.y - 0.098); float ez = smoothstep(0.014, 0.0, abs(wcaP.z - 0.06)), er = length(e);
      float lid = step(abs(e.y), 0.0145 * smoothstep(0.0, 0.06, abs(fract(t * 0.21) - 0.5) - 0.02));
      feat = max(feat, ez * lid * smoothstep(0.0055, 0.004, length(e - vec2(0.004 * sin(t * 0.8), 0.002 * sin(t * 0.5)))));
      sp = ez * lid * smoothstep(0.015, 0.012, er); }
    if (v > 2.5 && v < 3.5) sp = (1.0 - smoothstep(0.0, 0.006, abs(cr.x + 0.004 * sin(s * 30.0 - t * 4.0)))) * step(0.0, cr.y) * smoothstep(0.2, 0.5, s);
    if (v > 3.5 && v < 4.5) { float tooth = step(0.35, fract(s * 40.0)) * step(abs(wcaP.x - wcaO.x), 0.002) * step(0.3, s); sp = tooth * (0.6 + 0.4 * sin(t * 6.0 - s * 30.0)); }
    float gl = 0.5 + 0.5 * sin(t * 1.4 + s * 5.0);
    float gp = (s - (fract(t / 3.0) * 1.6 - 0.3)) / 0.06, rip = exp(-gp * gp) * (0.65 + 0.35 * sin(ang * 8.0 + t * 20.0));
    vec3 lit = wcaC * 0.3 + wcaA * (0.18 + 0.12 * gl) + wcaA * face * (0.6 + 0.3 * sin(t * 2.0 + h * 20.0)) + wcaB * rip * 1.3 + wcaB * sp * 1.4;
    lit += mix(wcaA, wcaB, 0.4) * rim * (0.6 + rip) * wcaR.y + wcaB * wcaStar(wcaP * 140.0, t * 2.0, 0.9) * 1.4;
    dif = mix(dif, vec3(0.015, 0.012, 0.004), feat * 0.95);
    col += lit * (1.0 - feat * 0.97);
  }
  return col * wcaK.y * wcaR.x;
}
`;
// (one function for every material, so they share their shader program; each its own uniforms)
const WCA_OBC = function (sh) {
  Object.assign(sh.uniforms, this.userData.wcaU);
  sh.defines = Object.assign({}, sh.defines, { WCA_TH: this.userData.wcaTh | 0 });
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + WCA_VERT)
    .replace('#include <project_vertex>', '#include <project_vertex>\n\twcaP = (wcaRoot * modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WCA_FRAG)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\t{ vec3 wcaD = diffuseColor.rgb; totalEmissiveRadiance += wcaFire(normal, normalize(vViewPosition), wcaD); diffuseColor.rgb = wcaD * wcaK.z; }')
    .replace('#include <lights_phong_fragment>', '#include <lights_phong_fragment>\n\tmaterial.specularColor *= wcaK.w;');
};
// (three.js tells programs apart by this: one per theme while it's ours, and as it would be otherwise, so the
// Bench's galaxy, or none, never picks up ours)
const WCA_KEY = function () { return this.onBeforeCompile === WCA_OBC ? 'wca' + (this.userData.wcaTh | 0) : this.onBeforeCompile.toString(); };
// (each piece of a weapon wearing it, just before it's drawn: where the weapon is now, and the time)
function wcaObr(r, sc, cm, geo, mt) {
  const u = mt && mt.userData && mt.userData.wcaU, root = mt && mt.userData && mt.userData.wcaOn; if (!u || !root) return;
  u.wcaRoot.value.copy(root.matrixWorld).invert();
  u.wcaT.value = reduceMotion ? 2.4 : (performance.now() / 1000) % 900;
}
// is this build's skin still on (the Lighthouse's reforging takes it off and puts its own on)
const wcaIntact = wp => { for (const mt of wp.wcaMats || []) if (mt.onBeforeCompile !== WCA_OBC) return false; return !!wp.wcaMats; };
// the skin a build (wp: { root, M }) of weapon id should be wearing: its equipped Admiral finish's, or none
// (plain: someone else's figure, always in the plain finish)
function wcaSkin(wp, id, plain) {
  if (!wp || !wp.M || !wp.root || typeof THREE === 'undefined') return;
  // reforged in the Lighthouse: its materials are the Bench's until it lets them go
  if (typeof ZMP_SK !== 'undefined' && ZMP_SK.has(wp)) { wp.wcaId = null; return; }
  let sk = null; try { if (!plain && typeof wcEquippedSkin === 'function') sk = wcEquippedSkin(id); } catch (e) {}
  const T = sk && WCA_THEMES[sk.id], S = WCA_SPAN[id];
  if (!T || !S) { if (wp.wcaMats) wcaOff(wp); return; }
  if (wp.wcaId === sk.id && wcaIntact(wp)) return;
  wp.wcaId = sk.id;
  const mats = new Set();
  for (const k in wp.M) {
    const mt = wp.M[k];
    if (!mt || !mt.isMaterial || WCA_SKIP.has(k) || !mt.isMeshPhongMaterial) continue;
    const R = WCA_ROLE[k] || [0.8, 0.8];
    // (its uniforms are kept for good once made, as the compiled program keeps them)
    const u = mt.userData.wcaU || (mt.userData.wcaU = { wcaT: { value: 0 }, wcaK: { value: new THREE.Vector4() }, wcaS: { value: new THREE.Vector4() }, wcaO: { value: new THREE.Vector2() }, wcaR: { value: new THREE.Vector2() }, wcaA: { value: new THREE.Color() }, wcaB: { value: new THREE.Color() }, wcaC: { value: new THREE.Color() }, wcaRoot: { value: new THREE.Matrix4() } });
    u.wcaK.value.set(T.th, T.k, T.dim, T.sp); u.wcaS.value.set(S[0], S[1], S[2], T.v || 0); u.wcaO.value.set(S[3], S[4]); u.wcaR.value.set(R[0], R[1]);
    u.wcaA.value.set(T.a); u.wcaB.value.set(T.b); u.wcaC.value.set(T.c);
    mt.userData.wcaOn = wp.root;
    if (mt.onBeforeCompile !== WCA_OBC || mt.userData.wcaTh !== T.th) { mt.userData.wcaTh = T.th; mt.onBeforeCompile = WCA_OBC; mt.customProgramCacheKey = WCA_KEY; mt.needsUpdate = true; }
    mats.add(mt);
  }
  wp.wcaMats = mats;
  // the hooks go on everything that wears it, the spare barrels and magazines held apart from the gun too
  const hook = o => { if (o.isMesh && [].concat(o.material).some(m => mats.has(m))) { o.onBeforeRender = wcaObr; o.userData.wcaH = 1; } };
  wp.root.traverse(hook);
  for (const k of ['fresh', 'spent', 'old', 'spare']) if (wp[k] && wp[k].traverse) wp[k].traverse(hook);
}
// back to the plain glowing accent
function wcaOff(wp) {
  for (const mt of wp.wcaMats || []) {
    if (mt.onBeforeCompile === WCA_OBC) { delete mt.onBeforeCompile; mt.needsUpdate = true; }
    if (mt.customProgramCacheKey === WCA_KEY) delete mt.customProgramCacheKey;
    delete mt.userData.wcaOn;
  }
  const unhook = o => { if (o.userData && o.userData.wcaH) { if (o.onBeforeRender === wcaObr) delete o.onBeforeRender; delete o.userData.wcaH; } };
  if (wp.root) wp.root.traverse(unhook);
  for (const k of ['fresh', 'spent', 'old', 'spare']) if (wp[k] && wp[k].traverse) wp[k].traverse(unhook);
  wp.wcaMats = null; wp.wcaId = null;
}

// ---------- the crate card's pictures ----------
// (from wcPreview, for an Admiral finish) the gun's shapes (gun: the group they're in) get a moving layer of the
// skin's theme clipped to them, and a moving halo behind; SVG animation, so it costs nothing to run
function wcaSvg(svg, gun, skin, uid, el) {
  const T = WCA_THEMES[skin.id]; if (!T) return;
  const NS = 'http://www.w3.org/2000/svg', still = typeof reduceMotion !== 'undefined' && reduceMotion;
  const defs = svg.querySelector('defs') || el('defs', {});
  if (defs.parentNode !== svg || svg.firstChild !== defs) svg.insertBefore(defs, svg.firstChild);
  // the gun's outline, as a clip (each filled shape again: a clip can't take a group)
  const clip = el('clipPath', { id: uid + 'c' }, defs);
  for (const s of gun.querySelectorAll('path, rect, circle, ellipse')) if (s.getAttribute('fill') !== 'none') clip.appendChild(s.cloneNode(false));
  const anim = (parent, attrs) => { if (!still) el(attrs.type ? 'animateTransform' : 'animate', Object.assign({ dur: '3s', repeatCount: 'indefinite' }, attrs.type ? Object.assign({ attributeName: 'transform' }, attrs) : attrs), parent); };
  const grad = (id, stops, kind, extra) => { const g = el(kind || 'linearGradient', Object.assign({ id: uid + id }, extra || {}), defs); for (const [o, c, a] of stops) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g); return g; };
  // a halo behind, breathing; and the gun itself glowing
  const back = el('g', {}); svg.insertBefore(back, gun);
  grad('h', [[0, T.a, 0.75], [0.6, T.c, 0.25], [1, T.c, 0]], 'radialGradient');
  const halo = el('ellipse', { cx: 62, cy: 31, rx: 60, ry: 27, fill: `url(#${uid}h)` }, back);
  anim(halo, { attributeName: 'opacity', values: '0.55;1;0.55', dur: '2.6s' });
  const fl = el('filter', { id: uid + 'f', x: '-20%', y: '-40%', width: '140%', height: '180%' }, defs);
  el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 1.6, result: 'b' }, fl);
  const fm = el('feMerge', {}, fl); el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
  gun.setAttribute('filter', `url(#${uid}f)`);
  const over = el('g', { 'clip-path': `url(#${uid}c)`, style: 'mix-blend-mode:screen' });
  svg.insertBefore(over, gun.nextSibling);
  const th = T.th;
  if (th === 0) {
    // the Skerry Light: a beam from the lamp at the muzzle sweeping out, and a bright band down the gun
    const beam = el('g', {}, back);
    grad('b', [[0, '#fff8dc', 0.85], [1, '#fff3c4', 0]], 'linearGradient', { x1: 0, x2: 1 });
    el('path', { d: 'M100 27 L160 0 L160 54 Z', fill: `url(#${uid}b)` }, beam);
    anim(beam, { type: 'rotate', values: '-70 100 27;70 100 27;-70 100 27', dur: '4.2s' });
    anim(beam, { attributeName: 'opacity', values: '0.2;0.9;0.2', dur: '4.2s' });
    grad('s', [[0, T.a, 0], [0.5, '#ffffff', 1], [1, T.a, 0]], 'linearGradient', { x1: 0, x2: 1 });
    const band = el('rect', { x: -30, y: 0, width: 26, height: 60, fill: `url(#${uid}s)` }, over);
    anim(band, { type: 'translate', values: '0 0;160 0', dur: '2.6s' });
    for (let i = 0; i < 5; i++) { const p = el('path', { d: `M${30 + i * 14} ${22 + (i % 2) * 10} q4 -5 8 0 t8 0`, fill: 'none', stroke: T.b, 'stroke-width': 1, opacity: 0.5 }, over); anim(p, { attributeName: 'opacity', values: '0.25;1;0.25', dur: '2.6s', begin: (i * 0.25) + 's' }); }
  } else if (th === 1) {
    // Charybdis: a whirlpool turning behind the bell mouth, and swirling bands over the barrel
    const v = el('g', {}, back);
    for (let i = 0; i < 4; i++) el('path', { d: `M110 27 m0 ${-4 - i * 5} a${4 + i * 5} ${4 + i * 5} 0 1 1 ${-(4 + i * 5) * 0.9} ${(4 + i * 5) * 1.3}`, fill: 'none', stroke: i % 2 ? T.b : T.a, 'stroke-width': 1.6 - i * 0.2, opacity: 0.85 - i * 0.15 }, v);
    anim(v, { type: 'rotate', values: '0 110 27;-360 110 27', dur: '3.5s' });
    const sw = el('g', {}, over);
    for (let i = -6; i < 16; i++) el('path', { d: `M${i * 10} 60 Q${i * 10 + 8} 30 ${i * 10 + 2} 0`, fill: 'none', stroke: i % 3 ? T.a : T.b, 'stroke-width': 2.6, opacity: 0.6 }, sw);
    anim(sw, { type: 'translate', values: '0 0;30 0', dur: '1.4s' });
  } else if (th === 2) {
    // Plimsoll's Eye: rippling light over the glass, and the eye in the lens opening
    const c = el('g', {}, over);
    for (let i = 0; i < 9; i++) el('path', { d: `M-40 ${8 + i * 6} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`, fill: 'none', stroke: i % 2 ? T.b : T.a, 'stroke-width': 1.2, opacity: 0.55 }, c);
    anim(c, { type: 'translate', values: '0 0;40 2;0 0', dur: '3.8s' });
    const eye = el('g', {}, svg);
    el('circle', { cx: 90, cy: 20, r: 6, fill: T.a, opacity: 0.35 }, eye);
    el('circle', { cx: 90, cy: 20, r: 2.8, fill: T.a }, eye); el('circle', { cx: 90, cy: 20, r: 1.2, fill: '#06202c' }, eye);
    const gl = el('circle', { cx: 91, cy: 19, r: 0.7, fill: '#ffffff' }, eye);
    anim(eye, { type: 'scale', values: '1 1;1 1;1 0.1;1 1', keyTimes: '0;0.9;0.95;1', dur: '4s', additive: 'sum' });
    eye.setAttribute('transform-origin', '90 20');
    anim(gl, { attributeName: 'r', values: '0.5;1.6;0.5', dur: '1.8s' });
  } else if (th === 3) {
    // Golden Leviathan: scales over it all, a molten ripple running through them
    const pat = el('pattern', { id: uid + 'p', width: 6, height: 5, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M0 5 A3 3 0 0 1 6 5 M-3 2.5 A3 3 0 0 1 3 2.5 M3 2.5 A3 3 0 0 1 9 2.5', fill: 'none', stroke: T.b, 'stroke-width': 0.7 }, pat);
    el('rect', { x: 0, y: 0, width: 120, height: 60, fill: `url(#${uid}p)`, opacity: 0.6 }, over);
    grad('m', [[0, T.c, 0], [0.5, T.b, 0.9], [1, T.c, 0]], 'linearGradient', { x1: 0, x2: 1 });
    const m = el('rect', { x: -40, y: 0, width: 36, height: 60, fill: `url(#${uid}m)` }, over);
    anim(m, { type: 'translate', values: '0 0;170 0', dur: '2.2s' });
  } else if (th === 4) {
    // the Last Lamp: firelight flickering through the blade, embers rising
    grad('l', [[0, '#fff3c4', 0.9], [0.5, T.c, 0.6], [1, T.c, 0]], 'radialGradient');
    const g = el('ellipse', { cx: 34, cy: 32, rx: 70, ry: 20, fill: `url(#${uid}l)` }, over);
    anim(g, { attributeName: 'opacity', values: '0.7;1;0.55;0.95;0.75;1;0.7', dur: '1.1s' });
    anim(g, { attributeName: 'rx', values: '62;76;66;72;62', dur: '1.7s' });
    for (let i = 0; i < 9; i++) {
      const x = 30 + i * 9 + (i % 3) * 2, e = el('circle', { cx: x, cy: 34, r: 0.9 + (i % 3) * 0.3, fill: i % 2 ? T.b : '#ffb040' }, svg);
      anim(e, { attributeName: 'cy', values: '34;4', dur: (1.6 + (i % 4) * 0.35) + 's', begin: (i * 0.23) + 's' });
      anim(e, { attributeName: 'opacity', values: '0;1;0', dur: (1.6 + (i % 4) * 0.35) + 's', begin: (i * 0.23) + 's' });
    }
  } else if (th === 7) {
    if (typeof vyWcaSvg === 'function') vyWcaSvg(svg, over, back, T, uid, el, anim, grad);   // [verity] src/verityfx.js
  } else if (th === 6) {
    // the Gannet's Locker: green ghost-fire rising through the gun, doubloons turning in it, bubbles, and the pulse
    for (let i = 0; i < 6; i++) {
      const x = 14 + i * 18, f = el('path', { d: `M${x - 6} 60 Q${x - 4} 34 ${x} 22 Q${x + 4} 34 ${x + 6} 60 Z`, fill: i % 2 ? T.a : '#d0fff0', opacity: 0.55 }, over);
      anim(f, { attributeName: 'd', values: `M${x - 6} 60 Q${x - 4} 34 ${x} 22 Q${x + 4} 34 ${x + 6} 60 Z;M${x - 6} 60 Q${x - 1} 30 ${x + 3} 14 Q${x + 5} 34 ${x + 6} 60 Z;M${x - 6} 60 Q${x - 4} 34 ${x} 22 Q${x + 4} 34 ${x + 6} 60 Z`, dur: (0.7 + (i % 3) * 0.15) + 's' });
    }
    grad('p', [[0, T.a, 0], [0.5, '#ffffff', 1], [1, T.b, 0]], 'linearGradient', { x1: 0, x2: 1 });
    const band = el('rect', { x: -30, y: 0, width: 18, height: 60, fill: `url(#${uid}p)` }, over);
    anim(band, { type: 'translate', values: '0 0;170 0', dur: '2.4s' });
    for (let i = 0; i < 4; i++) {
      const c = el('ellipse', { cx: 30 + i * 20, cy: 30 + (i % 2) * 4, rx: 2.6, ry: 2.6, fill: '#e8b830', stroke: '#8a6010', 'stroke-width': 0.5 }, svg);
      anim(c, { attributeName: 'rx', values: '2.6;0.4;2.6', dur: (1.6 + i * 0.3) + 's' });
      anim(c, { attributeName: 'cy', values: `${30 + (i % 2) * 4};${10 - i};${30 + (i % 2) * 4}`, dur: (2.6 + i * 0.4) + 's' });
    }
    for (let i = 0; i < 8; i++) {
      const b = el('circle', { cx: 18 + i * 12, cy: 46, r: 0.6 + (i % 3) * 0.35, fill: 'none', stroke: '#d0fff0', 'stroke-width': 0.5 }, svg);
      anim(b, { attributeName: 'cy', values: '48;4', dur: (1.8 + (i % 4) * 0.3) + 's', begin: (i * 0.25) + 's' });
      anim(b, { attributeName: 'opacity', values: '0;1;0', dur: (1.8 + (i % 4) * 0.3) + 's', begin: (i * 0.25) + 's' });
    }
  } else {
    // the Ninth Wave: a sea rolling along under foam, and spray
    const w = el('g', {}, over);
    el('path', { d: 'M-60 40 q7.5 -10 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 V60 H-60 Z', fill: T.a, opacity: 0.55 }, w);
    el('path', { d: 'M-60 40 q7.5 -10 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0', fill: 'none', stroke: T.b, 'stroke-width': 2, opacity: 0.95 }, w);
    anim(w, { type: 'translate', values: '0 0;30 0', dur: '1.5s' });
    const w2 = el('path', { d: 'M-60 30 q7.5 -8 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0', fill: 'none', stroke: T.b, 'stroke-width': 1.2, opacity: 0.6 }, over);
    anim(w2, { type: 'translate', values: '0 0;30 -3;0 0', dur: '2.4s' });
    for (let i = 0; i < 7; i++) {
      const e = el('circle', { cx: 20 + i * 14, cy: 26, r: 0.9, fill: T.b }, svg);
      anim(e, { attributeName: 'cy', values: '28;10', dur: (1.2 + (i % 3) * 0.3) + 's', begin: (i * 0.2) + 's' });
      anim(e, { attributeName: 'opacity', values: '0;1;0', dur: (1.2 + (i % 3) * 0.3) + 's', begin: (i * 0.2) + 's' });
    }
  }
  svg.classList.add('wcadm');
}
