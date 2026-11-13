// The 3D view's batching, for the first-person modes: many small meshes that never move against one another,
// drawn as one.
//
// The wreckers' figures, the Lighthouse's rooms, the raids' stages and the drowned are built from hundreds of small
// meshes (buttons, planks, rivets, fingers), and each one is a draw call of its own: that cost is the computer's
// processor's, not the graphics chip's, and in the Lighthouse it came to a thousand a frame. Here, meshes that have sat
// still for a moment (still against the nearest thing above them that does move: an arm, a door, a whole room) and
// look alike are copied, in that thing's own frame, into one mesh hung from it, and the originals are taken off
// the camera's layer: they stay where they are in the scene, and their `visible` is still the game's to set.
//
// Every frame, before drawing, each batch checks its originals and everything between them and where the batch hangs:
// if any of them has moved, been shown or hidden, swapped its material or geometry, had its vertices changed or been
// taken out of the scene, the batch is undone there and then (the originals drawn again, exactly as before), and the
// thing that changed never counts as still again. So the game never has to know: it moves, hides, swaps and removes
// things just as it always has. Materials are shared, not copied, so a colour or an opacity set on one still shows (and where
// several materials that looked alike were drawn as one, the batch is undone when one of them changes).
// Left out: anything see-through that spreads wide (it has to be sorted on its own), shader materials and materials
// with their own shader code (some work from a mesh's own coordinates), instanced, skinned and morphing meshes,
// interleaved or partly drawn geometry, and anything not drawn by frustum. Only while state is 'fps'.

const GLB = { batches: [], src: new Map(), recs: new Map(), vol: new WeakSet(), vmat: new WeakSet(), mkc: new WeakMap(), merged: new WeakSet(), bad: new WeakSet(),
  scan: 0, frame: 0, next: 0, IDLE: 30, STEADY: 1200, EVERY: 8, CELL: 30, TCELL: 2.5, MAXV: 200000, MS: 2.5, pend: [] };
const GLB_MAT = typeof THREE !== 'undefined' ? new THREE.Matrix4() : null, GLB_NM = typeof THREE !== 'undefined' ? new THREE.Matrix3() : null;

// a node's record: where it sits, whether it's shown, what hangs it, and (a mesh) what it's made of
function glbRead(o, r) {
  const p = o.position, q = o.quaternion, s = o.scale, a = r.a;
  a[0] = p.x; a[1] = p.y; a[2] = p.z; a[3] = q.x; a[4] = q.y; a[5] = q.z; a[6] = q.w; a[7] = s.x; a[8] = s.y; a[9] = s.z; a[10] = o.visible ? 1 : 0;
  if (!o.matrixAutoUpdate) { const e = o.matrix.elements; for (let i = 0; i < 16; i++) a[11 + i] = e[i]; }
  r.par = o.parent; r.mat = o.material; r.geo = o.geometry; r.av = o.isMesh && o.geometry ? glbAttrs(o.geometry) : null; r.gv = r.av ? glbGeoV(r.av) : 0; r.ro = o.renderOrder;
}
function glbSame(o, r) {
  const p = o.position, q = o.quaternion, s = o.scale, a = r.a;
  if (a[0] !== p.x || a[1] !== p.y || a[2] !== p.z || a[3] !== q.x || a[4] !== q.y || a[5] !== q.z || a[6] !== q.w || a[7] !== s.x || a[8] !== s.y || a[9] !== s.z || a[10] !== (o.visible ? 1 : 0)) return false;
  if (r.par !== o.parent || r.mat !== o.material || r.geo !== o.geometry || r.ro !== o.renderOrder) return false;
  if (!o.matrixAutoUpdate) { const e = o.matrix.elements; for (let i = 0; i < 16; i++) if (a[11 + i] !== e[i]) return false; }
  if (r.av && r.gv !== glbGeoV(r.av)) return false;
  return true;
}
// (a geometry's index and attributes, listed once, so the check each frame leaves nothing behind)
function glbAttrs(g) { const L = [g.drawRange]; if (g.index) L.push(g.index); for (const k in g.attributes) L.push(g.attributes[k]); return L; }
function glbGeoV(L) {
  const d = L[0]; let v = d.start * 13 + (d.count === Infinity ? 0 : d.count * 17);
  for (let i = 1; i < L.length; i++) v = v * 7 + (L[i].version | 0) + 1;
  return v;
}
function glbRec(o, now) {
  let r = GLB.recs.get(o);
  if (!r) { r = { a: new Float64Array(27), since: now, seen: 0 }; glbRead(o, r); GLB.recs.set(o, r); return r; }
  if (!glbSame(o, r)) { glbRead(o, r); r.since = now; }
  return r;
}
const glbSteady = (o, r, now) => r && !GLB.vol.has(o) && now - r.since >= GLB.STEADY;

// what a material looks like, as numbers (materials that look the same are drawn as one: each frame a batch checks
// that every material in it still looks as it did)
const GLB_MP = ['opacity', 'transparent', 'side', 'flatShading', 'vertexColors', 'fog', 'depthWrite', 'depthTest', 'blending', 'alphaTest', 'visible', 'shininess', 'wireframe', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'colorWrite', 'toneMapped', 'emissiveIntensity', 'reflectivity', 'version', 'premultipliedAlpha', 'dithering', 'forceSinglePass'];
const GLB_MC = ['color', 'emissive', 'specular'], GLB_MR = ['map', 'alphaMap', 'emissiveMap', 'specularMap', 'lightMap', 'aoMap', 'bumpMap', 'normalMap', 'envMap', 'displacementMap', 'gradientMap', 'matcap'];
function glbMatSig(m) {
  const a = [];
  for (const k of GLB_MP) { const v = m[k]; a.push(typeof v === 'number' ? v : v === true ? 1 : v === false ? 0 : v == null ? -1 : String(v)); }
  for (const k of GLB_MC) { const c = m[k]; if (c && c.isColor) a.push(c.r, c.g, c.b); else a.push(-1, -1, -1); }
  return a;
}
function glbMatSame(m, a) {
  let i = 0;
  for (const k of GLB_MP) { const v = m[k], w = a[i++]; if (w !== (typeof v === 'number' ? v : v === true ? 1 : v === false ? 0 : v == null ? -1 : String(v))) return false; }
  for (const k of GLB_MC) { const c = m[k]; if (c && c.isColor) { if (a[i] !== c.r || a[i + 1] !== c.g || a[i + 2] !== c.b) return false; } else if (a[i] !== -1) return false; i += 3; }
  return true;
}
// which materials can stand in for one another: the same kind, the same textures, and the same look
function glbMatKey(m) {
  if (GLB.vmat.has(m)) return 'own' + m.id;
  const c = GLB.mkc.get(m); if (c && glbMatSame(m, c.sig)) return c.k;
  const k = m.type + '|' + GLB_MR.map(n => m[n] ? m[n].id : '').join(',') + '|' + (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + '|' + Object.keys(m.defines || {}).join(',') + '|' + glbMatSig(m).join(',');
  GLB.mkc.set(m, { k, sig: glbMatSig(m) }); return k;
}

// can this mesh go in a batch at all?
function glbFits(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || GLB.merged.has(o) || GLB.bad.has(o) || !o.frustumCulled) return false;
  const m = o.material, g = o.geometry;
  if (!m || Array.isArray(m) || m.isShaderMaterial || m.isRawShaderMaterial || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return false;
  if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || o.onAfterRender !== THREE.Object3D.prototype.onAfterRender) return false;
  if (!g || !g.isBufferGeometry || !g.attributes.position || g.attributes.tangent || Object.keys(g.morphAttributes).length || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
  for (const k in g.attributes) if (g.attributes[k].isInterleavedBufferAttribute || g.attributes[k].isInstancedBufferAttribute) return false;
  if (g.index && g.index.isInterleavedBufferAttribute) return false;
  return true;
}
// the attributes' shape, so only geometries that line up go together
function glbAttrKey(g) {
  let k = g.index ? 'i' : 'n';
  for (const n of Object.keys(g.attributes).sort()) { const a = g.attributes[n]; k += '|' + n + a.itemSize + (a.normalized ? 'N' : '') + a.array.constructor.name; }
  return k;
}

// once in a while: note what's sat still, and gather what could go together
function glbScan(now) {
  const S = GL3D.scene, id = ++GLB.scan, cand = new Map();
  const walk = (o, anchor, ok) => {
    if (GLB.merged.has(o)) return;
    const r = glbRec(o, now); r.seen = id;
    const still = o !== S && glbSteady(o, r, now);
    // where things under this hang: here, unless this has sat still (then wherever this hangs)
    let a = anchor, good = ok && o.visible;
    if (o !== S && !still) { a = o; good = o.visible; }
    if (o !== S && still && good && !GLB.src.has(o) && glbFits(o)) {
      // (worked out once while it stays put under the same anchor and looks the same)
      const mk = glbMatKey(o.material);
      if (r.ca !== a || r.cmk !== mk) {
        const g = o.geometry;
        if (!g.boundingSphere) g.computeBoundingSphere();
        // its place in the anchor's frame
        const M = glbLocal(o, a), c = g.boundingSphere.center.clone().applyMatrix4(M), cell = o.material.transparent ? GLB.TCELL : GLB.CELL;
        r.ca = a; r.cmk = mk; r.ck = a.id + '|' + mk + '|' + o.renderOrder + '|' + glbAttrKey(g) + '|' + Math.floor(c.x / cell) + ',' + Math.floor(c.y / cell) + ',' + Math.floor(c.z / cell);
      }
      const key = r.ck;
      let L = cand.get(key); if (!L) { L = { a, list: [] }; cand.set(key, L); } L.list.push(o);
    }
    for (const ch of o.children) walk(ch, a, good);
  };
  walk(S, S, true);
  for (const [o, r] of GLB.recs) if (r.seen !== id) GLB.recs.delete(o);
  GLB.pend = [...cand.values()].filter(L => L.list.length >= 2);
}
// a mesh's matrix in the frame of something above it
function glbLocal(o, a) {
  const chain = []; for (let n = o; n && n !== a; n = n.parent) chain.push(n);
  const M = new THREE.Matrix4();
  for (let i = chain.length - 1; i >= 0; i--) { const n = chain[i]; if (n.matrixAutoUpdate) n.updateMatrix(); M.multiply(n.matrix); }
  return M;
}

// copy a group of meshes into one geometry, in their anchor's frame
function glbBuild(P) {
  const { a, list } = P, S = GL3D.scene;
  // still all as they were when gathered?
  let L = list.filter(o => !GLB.src.has(o) && glbFits(o) && glbAttached(o, S));
  if (L.length < 2) return;
  // (and every material still looking like the first: one drawn for all of them)
  const m0 = L[0].material, s0 = glbMatSig(m0); L = L.filter(o => o.material === m0 || (o.material.type === m0.type && glbMatSame(o.material, s0)));
  if (L.length < 2) return;
  const g0 = L[0].geometry, names = Object.keys(g0.attributes);
  let nv = 0, ni = 0; const indexed = !!g0.index;
  for (const o of L) { const g = o.geometry; nv += g.attributes.position.count; ni += indexed ? g.index.count : 0; }
  if (nv > GLB.MAXV) return;
  const out = new THREE.BufferGeometry(), arrs = {};
  for (const n of names) { const s = g0.attributes[n]; arrs[n] = new s.array.constructor(nv * s.itemSize); }
  const idx = indexed ? (nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni)) : null;
  let vo = 0, io = 0;
  const nodes = new Set();
  for (const o of L) {
    const g = o.geometry, M = glbLocal(o, a), e = M.elements, n = g.attributes.position.count;
    GLB_NM.getNormalMatrix(M); const ne = GLB_NM.elements, flip = M.determinant() < 0;
    for (const k of names) {
      const s = g.attributes[k], d = arrs[k], sz = s.itemSize, src = s.array, base = vo * sz;
      if (k === 'position') for (let i = 0; i < n; i++) { const x = s.getX(i), y = s.getY(i), z = s.getZ(i), j = base + i * 3;
        d[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; d[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; d[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
      else if (k === 'normal') for (let i = 0; i < n; i++) { const x = s.getX(i), y = s.getY(i), z = s.getZ(i), j = base + i * 3;
        let X = ne[0] * x + ne[3] * y + ne[6] * z, Y = ne[1] * x + ne[4] * y + ne[7] * z, Z = ne[2] * x + ne[5] * y + ne[8] * z; const l = Math.hypot(X, Y, Z) || 1;
        d[j] = X / l; d[j + 1] = Y / l; d[j + 2] = Z / l; }
      else if (src.length >= n * sz) d.set(src.subarray(0, n * sz), base);
    }
    if (indexed) { const si = g.index.array, c = g.index.count; for (let i = 0; i < c; i += 3) { const p = si[i] + vo, q = si[i + 1] + vo, r = si[i + 2] + vo; idx[io++] = p; if (flip) { idx[io++] = r; idx[io++] = q; } else { idx[io++] = q; idx[io++] = r; } } }
    else if (flip) {
      // (mirrored: the triangles turned the other way round, so they still face out)
      for (const k of names) { const d = arrs[k], sz = g0.attributes[k].itemSize; for (let i = 0; i + 2 < n; i += 3) for (let c = 0; c < sz; c++) { const x = (vo + i + 1) * sz + c, y = (vo + i + 2) * sz + c, t = d[x]; d[x] = d[y]; d[y] = t; } }
    }
    vo += n;
    for (let x = o; x && x !== a; x = x.parent) nodes.add(x);
  }
  for (const k of names) { const s = g0.attributes[k]; out.setAttribute(k, new THREE.BufferAttribute(arrs[k], s.itemSize, s.normalized)); }
  if (idx) out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere(); out.computeBoundingBox();
  const mesh = new THREE.Mesh(out, L[0].material);
  mesh.renderOrder = L[0].renderOrder; mesh.castShadow = L[0].castShadow; mesh.receiveShadow = L[0].receiveShadow; mesh.name = 'batch';
  GLB.merged.add(mesh); a.add(mesh); mesh.updateMatrixWorld();
  const mats = [...new Set(L.map(o => o.material))];
  const B = { a, mesh, srcs: L, nodes: [...nodes], masks: L.map(o => o.layers.mask), mats, msig: mats.map(glbMatSig) };
  for (const o of L) { GLB.src.set(o, B); o.layers.mask = 0; }
  // what each frame checks against: the records as they are now
  for (const x of B.nodes) { const r = GLB.recs.get(x) || glbRec(x, 0); glbRead(x, r); }
  GLB.batches.push(B);
}
function glbAttached(o, S) { for (let x = o; x; x = x.parent) if (x === S) return true; return false; }

// undo a batch: the originals drawn again, the copy gone
function glbUndo(B) {
  B.srcs.forEach((o, i) => { if (o.layers.mask === 0) o.layers.mask = B.masks[i]; GLB.src.delete(o); });
  if (B.mesh.parent) B.mesh.parent.remove(B.mesh);
  B.mesh.geometry.dispose();
  const i = GLB.batches.indexOf(B); if (i >= 0) GLB.batches.splice(i, 1);
}
function glbClear() { while (GLB.batches.length) glbUndo(GLB.batches[GLB.batches.length - 1]); GLB.recs.clear(); GLB.pend = []; }

// each frame, before the 3D view is drawn
function glbTick() {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  if (state !== 'fps' || GLB.off) { if (GLB.batches.length || GLB.recs.size) glbClear(); return; }
  const now = performance.now(), S = GL3D.scene;
  // anything changed under a batch: undone at once, and what changed never counts as still again
  for (let b = GLB.batches.length - 1; b >= 0; b--) {
    const B = GLB.batches[b]; let gone = B.mesh.parent !== B.a;
    if (!gone) for (const x of B.nodes) { const r = GLB.recs.get(x); if (!r || !glbSame(x, r)) { GLB.vol.add(x); if (r) { glbRead(x, r); r.since = now; } gone = true; break; } }
    if (!gone) for (const o of B.srcs) if (o.layers.mask !== 0) { GLB.vol.add(o); gone = true; break; }
    // (a material changed: those that looked alike may not now; that material isn't shared out again)
    if (!gone && B.mats.length > 1) for (let i = 0; i < B.mats.length; i++) if (!glbMatSame(B.mats[i], B.msig[i])) { GLB.vmat.add(B.mats[i]); gone = true; break; }
    if (!gone && (GLB.frame % GLB.EVERY === 0) && !glbAttached(B.a, S)) gone = true;
    if (gone) glbUndo(B);
  }
  GLB.frame++;
  // build what's waiting, a little each frame; then look again
  if (GLB.pend.length) { const t0 = performance.now(); while (GLB.pend.length && performance.now() - t0 < GLB.MS) { const P = GLB.pend.shift(); try { glbBuild(P); } catch (e) { for (const o of P.list) GLB.bad.add(o); } } }
  else if (GLB.frame >= GLB.next) { glbScan(now); GLB.next = GLB.frame + (GLB.pend.length ? GLB.EVERY : GLB.IDLE); }
}

// a copy of something batched: drawn like the original, and without the batch's own copy
if (typeof THREE !== 'undefined') {
  const copy0 = THREE.Object3D.prototype.copy;
  THREE.Object3D.prototype.copy = function (source, recursive) {
    copy0.call(this, source, recursive);
    const B = GLB.src.get(source); if (B) { const i = B.srcs.indexOf(source); this.layers.mask = B.masks[i]; }
    if (recursive !== false && source.children.length === this.children.length) for (let i = source.children.length - 1; i >= 0; i--) if (GLB.merged.has(source.children[i])) this.remove(this.children[i]);
    return this;
  };
}
