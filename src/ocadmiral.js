// Wreckers' Night: the Admirals' outfits alight, on the 3D figures (fpsbody.js).
//
// The two Admiral outfits of the Tailor's Crate (ocrates.js, marked `adm`) are as rich as a reforged weapon
// (zmpap.js), each in its own theme:
//  - The Drowned Captain: the coat is deep water, drifting sea-green caustics playing over it (brighter towards
//    the collar, as if the surface were just above), bioluminescent veins with pulses of light climbing them,
//    glowing water running down it in drips, and plankton specks twinkling as they drift up. The trim glows
//    with travelling ripples; bubbles rise round the figure; and behind the head a halo of green ghost-fire
//    licks outwards and flickers.
//  - The Keeper of the Light: the coat is cream worked with gold filigree that glows and shimmers, and the
//    lighthouse's own beam (with its fainter twin on the far side) sweeps slowly round the figure, lighting the
//    filigree as it passes. Warm motes spiral up round it, and behind the head a radiant halo turns: a golden
//    ring set with jewels and two sets of rays turning against each other, the beam flashing round it too.
// One shader added onto the figure's own Lambert materials (coat, lining, hat, trim, sash, waistcoat,
// breeches, buttons), one function for every one of them so they share their programs (each material only
// its own uniforms: how much pattern and how much glow), the pattern laid out in the figure's own space so it
// stays on the cloth as the figure moves. The halo and the motes are one plane and one cloud of 28 points per
// figure, their movement worked out in the shader from the time (nothing moved on the CPU), on geometry shared
// by every figure. Each frame a figure only sets its own place and how solid it is (ocaPose: no allocations).
// With reduce motion it all holds still. A change of outfit builds a new figure, so nothing needs undoing.
//
// The global API, for fpsbody.js:
//   ocaDress(F)        -> after a figure is built: puts it on if the outfit is an Admiral's (true if it did)
//   ocaPose(F, op)     -> each frame, from fbPose
//   ocaDispose(F)      -> with the figure

var OCA = { T: null, H: null, geo: null, plane: null, cols: {} };
// by outfit: [mode (0 drowned, 1 keeper), the glow, the brightest light, the deep colour underneath]
// and how far its cloth is shaded down underneath, so the light on it shows (the Keeper's cream would wash out)
var OCA_LOOK = { drowned: [0, '#3affc8', '#c8fff4', '#04342c', 1], keeper: [1, '#ffc23a', '#fff6d8', '#5a3a08', 0.42] };
// each slot: [how much of the pattern, how much glow]
var OCA_ROLE = { coat: [1, 0], lining: [0, 0], hat: [0.8, 0], waist: [0.45, 0], breeches: [0.3, 0], sash: [0.55, 0.5], trim: [0.5, 1], brass: [0, 1.3] };

var OCA_VERT = 'uniform mat4 oaRoot;\nvarying vec3 oaP;\n';
var OCA_NOISE = `
float oaH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float oaN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(oaH(i), oaH(i + vec3(1, 0, 0)), f.x), mix(oaH(i + vec3(0, 1, 0)), oaH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(oaH(i + vec3(0, 0, 1)), oaH(i + vec3(1, 0, 1)), f.x), mix(oaH(i + vec3(0, 1, 1)), oaH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
`;
var OCA_FRAG = `uniform float oaT; uniform float oaO; uniform float oaM; uniform vec2 oaR; uniform vec3 oaA; uniform vec3 oaB; uniform vec3 oaC;
varying vec3 oaP;
` + OCA_NOISE + `
float oaF(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * oaN(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s / 0.875; }
// a speck now and then in a cell, twinkling
float oaSpeck(vec3 p, float t, float dens) {
  vec3 c = floor(p), f = fract(p); float h = oaH(c);
  if (h < dens) return 0.0;
  vec3 o = vec3(oaH(c + 3.1), oaH(c + 7.7), oaH(c + 1.3)) * 0.6 + 0.2;
  return pow(max(0.0, 1.0 - length(f - o) * 2.6), 4.0) * (0.55 + 0.45 * sin(t * (2.0 + h * 5.0) + h * 60.0));
}
// the Keeper's filigree: the contours of a still pattern, worked in gold into the cloth (x), and the pattern (y)
vec2 oaFiligree() {
  vec3 p = oaP; float f = oaF(p * vec3(4.0, 3.0, 4.0)), f2 = oaN(p * vec3(9.0, 7.0, 9.0) + 3.0);
  return vec2(1.0 - smoothstep(0.03, 0.08, abs(fract(f * 8.0 + f2 * 0.6) - 0.5)), f);
}
vec3 oaLight(vec3 n, vec3 v, float fil, float f) {
  vec3 p = oaP; float t = oaT, ang = atan(p.x, p.z);
  float rim = pow(1.0 - abs(dot(n, v)), 2.0);
  vec3 col = vec3(0.0);
  if (oaM < 0.5) {
    // (the glow on its own, where there's no pattern: the buttons, the lining)
    float cau = 0.0;
    if (oaR.x > 0.0) {
      // deep water, slowly stirring
      float w = oaN(p * vec3(3.0, 1.6, 3.0) + vec3(0.0, -t * 0.12, t * 0.05));
      vec3 deep = oaC * (0.4 + 1.1 * w);
      // caustics: where two drifting fields cross, a web of light; brighter up towards the surface
      float n1 = oaN(p * vec3(9.0, 6.0, 9.0) + vec3(t * 0.35, t * 0.5, -t * 0.2) + w * 2.0);
      float n2 = oaN(p * vec3(8.0, 5.0, 8.0) - vec3(t * 0.25, -t * 0.4, t * 0.3) + 5.3);
      cau = pow(1.0 - smoothstep(0.0, 0.14, abs(n1 + n2 - 1.0)), 3.0) * (0.3 + 0.7 * smoothstep(0.4, 1.7, p.y));
      // bioluminescent veins, pulses of light climbing them
      vec3 vp = p * vec3(5.0, 2.5, 5.0) + vec3(2.0, 0.0, 7.0);
      float vein = pow(1.0 - abs((oaN(vp) * 0.67 + oaN(vp * 2.03 + 4.1) * 0.33) * 2.0 - 1.0), 9.0);
      float pul = 0.5 + 0.5 * sin(p.y * 10.0 - t * 2.6 + w * 7.0);
      vein *= 0.3 + 1.7 * pul * pul * pul;
      // water running down it, in lanes round the figure
      float cl = ang * 3.8197, h = oaH(vec3(floor(cl), 3.0, 1.0)), fx = fract(cl);
      float hd = 1.0 - fract(p.y * 0.7 + t * (0.25 + 0.35 * h) + h * 7.0);
      float drip = step(0.5, h) * (1.0 - smoothstep(0.04, 0.14, abs(fx - 0.5))) * (pow(hd, 14.0) * 1.6 + pow(hd, 3.0) * 0.2);
      float sp = oaSpeck(p * 24.0 + vec3(0.0, -t * 1.2, 0.0), t, 0.9);
      col = (deep + oaB * cau * 0.6 + oaA * vein * 1.0 + oaB * drip + oaB * sp * 1.5 + oaA * rim * 0.45) * oaR.x;
    }
    float tg = 0.5 + 0.5 * sin(p.y * 14.0 - t * 3.0 + ang * 2.0);
    col += oaA * oaR.y * (0.35 + 0.75 * tg * tg + cau * 0.5);
  } else {
    // the lighthouse beam sweeping round, and its fainter twin opposite
    float d = cos(ang - t * 0.85 + p.y * 0.25), sh = 0.5 + 0.5 * sin(f * 30.0 - t * 1.8 + p.y * 4.0);
    float beam = pow(max(d, 0.0), 18.0) * 1.4 + pow(max(d, 0.0), 3.0) * 0.08 + pow(max(-d, 0.0), 30.0) * 0.5;
    if (oaR.x > 0.0) {
      // the gold filigree (worked into the cloth itself, oaFiligree) glowing, a shimmer running through it, lit up as the beam passes
      float sp = oaSpeck(p * 26.0 + vec3(0.0, -t * 0.9, 0.0), t, 0.9);
      col = (oaC * (0.06 + 0.14 * f) + oaA * fil * (0.14 + 0.4 * sh * sh + beam * 1.8) + oaB * beam * 0.45 + oaB * sp * 1.3 + oaA * rim * 0.15) * oaR.x;
    }
    col += oaA * oaR.y * (0.4 + 0.45 * sh + beam);
  }
  return col * oaO;
}
`;
// (one function for every material, so they share their shader programs; each its own uniforms)
var OCA_OBC = function (sh) {
  Object.assign(sh.uniforms, this.userData.ocaU);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + OCA_VERT)
    .replace('#include <project_vertex>', '#include <project_vertex>\n\toaP = (oaRoot * modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + OCA_FRAG)
    .replace('#include <color_fragment>', '#include <color_fragment>\n\tvec2 oaFl = oaM > 0.5 && oaR.x > 0.0 ? oaFiligree() : vec2(0.0);\n\tdiffuseColor.rgb *= mix(vec3(1.0), vec3(1.0, 0.58, 0.1), oaFl.x * 0.9 * oaR.x);')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += oaLight(normal, normalize(vViewPosition), oaFl.x, oaFl.y);');
};

// the motes (the Keeper's) or bubbles (the Drowned Captain's), rising round the figure
var OCA_PTS_V = `uniform float oaT; uniform float oaHt; uniform float oaM; uniform float oaO; attribute vec4 seed; varying float vA; varying float vK;
void main() {
  float life = fract(oaT * (oaM < 0.5 ? 0.2 + 0.16 * seed.y : 0.12 + 0.1 * seed.y) + seed.x);
  vec3 p;
  if (oaM < 0.5) { float a = seed.z * 6.2832, r = 0.2 + 0.18 * seed.w; p = vec3(sin(a) * r + sin(oaT * 2.3 + seed.x * 20.0) * 0.04 * life, 0.1 + life * 2.1, cos(a) * r * 0.85); }
  else { float a = seed.z * 6.2832 + life * 4.0 + oaT * 0.2, r = 0.3 + 0.22 * seed.w + life * 0.18; p = vec3(sin(a) * r, 0.05 + life * 2.3, cos(a) * r); }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, (oaM < 0.5 ? 0.022 + 0.03 * seed.w : 0.035 + 0.035 * seed.y) * oaHt * projectionMatrix[1][1] / max(0.1, -mv.z));
  vA = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.7, 1.0, life)) * oaO; vK = seed.y;
}`;
var OCA_PTS_F = `uniform float oaT; uniform float oaM; uniform vec3 oaA; uniform vec3 oaB; varying float vA; varying float vK;
void main() {
  vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
  vec3 c; float a;
  if (oaM < 0.5) { float ring = smoothstep(1.0, 0.82, d) * smoothstep(0.45, 0.82, d), hl = smoothstep(0.35, 0.0, length(q - vec2(-0.16, -0.16)) * 2.0);
    c = oaB * ring + vec3(1.0) * hl + oaA * 0.3; a = ring + hl * 0.7 + 0.12; }
  else { float g = pow(1.0 - d, 2.0); c = mix(oaA, oaB, g) * 1.3; a = g * (0.55 + 0.45 * sin(oaT * 7.0 + vK * 40.0)); }
  gl_FragColor = vec4(c, a * vA);
}`;
// the halo behind the head (one small plane, turned to face you)
var OCA_HALO_V = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
var OCA_HALO_F = `uniform float oaT; uniform float oaM; uniform float oaO; uniform vec3 oaA; uniform vec3 oaB; uniform vec3 oaC; varying vec2 vUv;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 q = (vUv - 0.5) * 1.1;
  float r = length(q); if (r > 0.55) discard;
  float a = atan(q.x, q.y), d = r - 0.27, t = oaT, aura = exp(-r * r * 9.0);
  vec3 col;
  if (oaM < 0.5) {
    // ghost-fire: tongues of green flame licking outwards from a burning ring, tallest at the top
    float fl = n2(vec2(a * 4.0, d * 9.0 - t * 3.0)) * 0.65 + n2(vec2(a * 9.0 + 3.0, d * 18.0 - t * 5.0)) * 0.35;
    float hgt = 0.04 + 0.22 * fl * (0.55 + 0.45 * cos(a));
    float tongue = d > 0.0 ? pow(clamp(1.0 - d / hgt, 0.0, 1.0), 1.5) : exp(-d * d / 0.0009);
    float core = exp(-d * d / 0.0002) * (0.7 + 0.3 * sin(a * 5.0 + t * 4.0));
    col = mix(oaC * 2.0, oaA, tongue) * tongue * 1.2 + oaB * core + oaA * aura * 0.2;
  } else {
    // a radiant ring set with jewels, rays turning both ways, and the beam flashing round it
    float ring = exp(-d * d / 0.0003) + exp(-(r - 0.22) * (r - 0.22) / 0.00008) * 0.5;
    float fall = d > 0.0 ? exp(-d * 6.5) : exp(d * 30.0);
    float rays = (pow(0.5 + 0.5 * cos(a * 12.0 - t * 0.7), 10.0) + pow(0.5 + 0.5 * cos(a * 7.0 + t * 0.45), 14.0) * 0.7) * fall * smoothstep(-0.02, 0.03, d);
    float jf = fract(a * 1.9099 + t * 0.1) - 0.5, jewel = exp(-pow(jf / 0.1, 2.0) - d * d / 0.0003);
    float bm = pow(max(cos(a - t * 0.85), 0.0), 30.0) * fall;
    col = oaA * ring * 1.2 + mix(oaA, oaB, 0.5) * rays * 0.75 + oaB * bm * 0.9 + oaB * jewel * 1.3 + oaA * aura * 0.2;
  }
  float ef = smoothstep(0.55, 0.4, r);
  gl_FragColor = vec4(col * oaO * ef, 1.0);
}`;

function ocaShared() {
  if (OCA.T) return true;
  if (typeof THREE === 'undefined') return false;
  OCA.T = { value: 0 }; OCA.H = { value: 360 }; OCA.v = new THREE.Vector3(); OCA.q = new THREE.Quaternion();
  const N = 28, seed = new Float32Array(N * 4), pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 4; i++) seed[i] = Math.random();
  const g = OCA.geo = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 1.6);
  OCA.plane = new THREE.PlaneGeometry(1.1, 1.1);
  return true;
}
function ocaColour(hex) { return OCA.cols[hex] || (OCA.cols[hex] = { value: new THREE.Color(hex) }); }

function ocaDress(F) {
  const oc = F.oc, L = oc && OCA_LOOK[oc.adm];
  if (!L || !ocaShared()) return false;
  const A = ocaColour(L[1]), B = ocaColour(L[2]), C = ocaColour(L[3]), mode = { value: L[0] };
  const O = F.ocaO = { value: 1 }, R = F.ocaR = { value: new THREE.Matrix4() };
  for (const k in OCA_ROLE) {
    const mt = F.M[k]; if (!mt) continue;
    mt.userData.ocaU = { oaT: OCA.T, oaO: O, oaM: mode, oaR: { value: new THREE.Vector2(OCA_ROLE[k][0], OCA_ROLE[k][1]) }, oaA: A, oaB: B, oaC: C, oaRoot: R };
    if (OCA_ROLE[k][1] === 0 && mt.userData.base) mt.userData.base.multiplyScalar(L[4]);
    mt.onBeforeCompile = OCA_OBC; mt.emissive.set(0); mt.emissiveIntensity = 1; mt.needsUpdate = true;
  }
  // (added onto what's behind, leaving the canvas's own alpha alone: the 3D canvas is see-through over the sky)
  const add = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, transparent: true, depthWrite: false };
  const pm = new THREE.ShaderMaterial(Object.assign({ uniforms: { oaT: OCA.T, oaHt: OCA.H, oaM: mode, oaO: O, oaA: A, oaB: B }, vertexShader: OCA_PTS_V, fragmentShader: OCA_PTS_F }, add));
  const pts = F.ocaPts = new THREE.Points(OCA.geo, pm); pts.userData.keep = true; pts.frustumCulled = false; F.root.add(pts);
  const hm = new THREE.ShaderMaterial(Object.assign({ uniforms: { oaT: OCA.T, oaM: mode, oaO: O, oaA: A, oaB: B, oaC: C }, vertexShader: OCA_HALO_V, fragmentShader: OCA_HALO_F }, add));
  const halo = new THREE.Mesh(OCA.plane, hm); halo.userData.keep = true; halo.position.y = 1.75; F.root.add(halo);
  if (F.halo) { F.root.remove(F.halo); F.halo.geometry.dispose(); F.halo.material.dispose(); }
  F.halo = halo; F.ocaMats = [pm, hm];
  return true;
}

// each frame: where the figure is (its own space, for the pattern), how solid it is, and the time
function ocaPose(F, op) {
  const root = F.root;
  OCA.T.value = reduceMotion ? 0 : (performance.now() / 1000) % 600;
  try { if (GL3D.r) OCA.H.value = GL3D.r.domElement.height * 0.5; } catch (e) {}
  F.ocaR.value.compose(root.position, root.quaternion, root.scale).invert();
  F.ocaO.value = op;
  if (F.eyeMat) F.eyeMat.opacity = op * (0.75 + 0.25 * Math.sin(OCA.T.value * 3));
  // (turned to face you, and set back a little behind the head, away from you)
  const c = GL3D.camera, v = OCA.v.set(c.position.x - root.position.x, 0, c.position.z - root.position.z), l = v.length() || 1;
  v.multiplyScalar(-0.22 / l).applyQuaternion(OCA.q.copy(root.quaternion).invert());
  F.halo.position.set(v.x, 1.75, v.z);
  F.halo.quaternion.copy(OCA.q).multiply(c.quaternion);
}
function ocaDispose(F) { if (F && F.ocaMats) for (const m of F.ocaMats) m.dispose(); }
