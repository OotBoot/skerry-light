'use strict';
// The Chronicle of the Light, mission 14, The Drowned Reach: its cinematics (the parts are src/cpm14x.js and
// src/cpm14y.js; the shared world src/cpm14.js). Each is shot in the world of the part it belongs to:
//  m14_intro    (Part I's holm, at dusk) the years after: the sea came back with every sea's people; the Reach at war,
//               its beacons and burning fire-ships; the Light far off in the middle, dark; the Ember line on the beach.
//  m14_tide     (Part I, after) the tide going out (RCH.tideK lowers the sea), the shoal road showing north to the
//               Light, and Plimsoll standing on it, looking at the lamp.
//  m14_rock     (Part III, before) the back of the keeper's station from the reef; the Ember Commodore's hail.
//  m14_comm     (Part III, when he comes out) the Commodore and his guards at the back door.
//  m14_climb    (Part III, after) the tower from outside, its windows lighting one by one as you climb (RCH.climb);
//               a voice from the top.
//  m14_lens     (Part IV, before) the lantern room: the Lampwright by his lens, Holm's log on the desk.
//  m14_keepers  (Part IV, after) the beam over the whole Reach; the nations dip their beacons (RCH.dip).
//  m14_outro    (Part IV's gallery) the epilogue: the last page of the log; the tales out of their order; Maren in her
//               skiff, rowing out to the Gannet, looking up as the beam goes over.
// Voice lines: cp_m14_01 to cp_m14_09, cp_m14_34 to cp_m14_47, cp_m14_75 to cp_m14_99.

const rchCineEnd = () => { RCH.cineAt = null; RCH.tideK = null; RCH.climb = null; RCH.lensK = null; RCH.lensA = null; RCH.dip = null; };
// (a sprite of one of the game's own drawings, for an actor)
function rchImgSprite(img, h, flip) { const t = typeof gwsImgTex === 'function' ? gwsImgTex(img, false, flip) : null, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, alphaTest: 0.05 })); const asp = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.6; s.scale.set(h * asp, h, 1); s.center.set(0.5, 0.02); return s; }

// ---------- the opening ----------
cpCineDef('m14_intro', { music: 'cpm14war', exit: rchCineEnd, shots: [
  cpTitleShot(CP_BY.m14),
  { d: 5, card: { eye: 'Undated', t: 'The Years After', sub: 'The sea came back up the Swallow' }, lines: [[0.5, 'log', 'The sea came back, and with it the people of every sea and every year that ever sailed through the skerries.', 'cp_m14_01']] },
  { d: 6, cam: [-30, -120, 22], to: [-8, -80, 12], look: [0, 40, 6], fade: [1, 0], lines: [[0.4, 'log', 'They landed on the islands round the Light, and went to war for them. The charts call it the Drowned Reach.', 'cp_m14_02']] },
  { d: 5.5, cam: [4, -46, 1.6], to: [2, -38, 1.8], look: [0, 250, 14], lines: [[0.4, 'rchmate', 'That’s the Light, out in the middle of it all. Dark, these many years.', 'cp_m14_03']],
    f() { RCH.cineAt = { mate: { x: 1.5, y: -36, h: 0 } }; } },
  { d: 5, cam: [-6, -26, 1.5], to: [6, -25, 1.7], look: [0, -9, 1.4], lines: [[0.3, 'rchmate', 'Every nation in the Reach wants the name of Keeper. Not one of them can light it.', 'cp_m14_04']] },
  { d: 4.5, cam: [3.5, -33.5, 1.7], look: [1.5, -31, 1.6], lines: [[0.3, 'rchmate', 'So we will. Up the beach, and mind their muskets. They show a flash in the pan before they fire.', 'cp_m14_05']],
    f() { RCH.cineAt = { mate: { x: 1.5, y: -31, h: Math.PI + 0.3 } }; } },
] });

// ---------- low water ----------
cpCineDef('m14_tide', { music: 'cpm14shoal', exit: rchCineEnd,
  b3(grp, C) { const s = C.plim = rchImgSprite(IMG.plim, 2.6); const [x, y] = rchW(0, 47); s.position.copy(z3v(x, y, FPSC.GROUND - 0.1)); s.visible = false; grp.add(s); const gl = C.gl = new THREE.Sprite(rchSoft('rgba(95,211,255,0.5)', 'rgba(95,211,255,0)')); gl.scale.setScalar(5); gl.position.copy(z3v(x, y, FPSC.GROUND + 0.3)); gl.visible = false; grp.add(gl); },
  shots: [
    { d: 6, cam: [0, 20, 3], to: [0, 26, 5], look: [0, 80, 0], lines: [[0.5, 'rchmate', 'Look at her go. The whole Reach is draining.', 'cp_m14_34']], f(t, k) { RCH.tideK = Math.min(1, k * 1.1); RCH.cineAt = { mate: { x: -1.5, y: 24, h: 0 } }; } },
    { d: 6, cam: [12, 18, 18], to: [6, 30, 24], look: [0, 160, 0], lines: [[0.6, 'rchmate', 'And there he is. Blue shoes and all. I’d know him in any year.', 'cp_m14_35']], f(t, k, C) { RCH.tideK = 1; C.plim.visible = true; C.gl.visible = true; } },
    { d: 6.5, cam: [1.5, 40, 1.4], to: [0.8, 42, 1.6], look: [0, 300, 22], lines: [[0.5, 'log', 'The only things that never change are the light, the shark in his shoes, and her.', 'cp_m14_36']], f(t, k, C) { RCH.tideK = 1; C.plim.visible = true; C.gl.visible = true; } },
  ] });

// ---------- the back of the station ----------
cpCineDef('m14_rock', { music: 'cpm14rock', exit: rchCineEnd, shots: [
  { d: 5.5, cam: [16, 70, 6], to: [6, 58, 4], look: [0, 20, 8], fade: [1, 0], lines: [[0.5, 'rchmate', 'The keeper’s station, from the back. In all the years I never once saw it from this side.', 'cp_m14_40']] },
  { d: 5.5, cam: [0, 46, 1.7], to: [0, 42, 2.2], look: [0, 1.5, 26], lines: [[0.4, 'rchcomm', 'Whoever you are: this rock is the Ember Isles’. We hold it, so we are its Keepers.', 'cp_m14_41']] },
  { d: 4, cam: [2.5, 51, 1.7], look: [3, 49, 1.6], lines: [[0.3, 'rchmate', 'You hold it dark.', 'cp_m14_42']], f() { RCH.cineAt = { mate: { x: 3, y: 49, h: Math.PI + 0.3 } }; } },
] });
cpCineDef('m14_comm', { music: 'cpm14rock', exit: rchCineEnd, shots: [
  { d: 4.5, cam: [0, 36, 1.5], to: [0, 33, 1.6], look: [0, 28, 1.6], lines: [[0.3, 'rchcomm', 'Lamp-men. On my rock. I have hanged better men for less.', 'cp_m14_44']] },
  { d: 4.5, cam: [-4, 31, 2.4], look: [0, 28, 1.7], lines: [[0.2, 'rchcomm', 'Every nation remembers an oath-breaker. Nobody remembers a lamp-man.', 'cp_m14_45']] },
] });

// ---------- ninety treads ----------
cpCineDef('m14_climb', { music: 'cpm14keep', exit: rchCineEnd, shots: [
  { d: 4, card: { eye: 'The Light', t: 'Ninety treads', sub: 'Up through the dark station, with the oil' } },
  { d: 9, cam: [0, 44, 2], to: [0, 40, 4], look: [0, 1.5, 6], lookTo: [0, 1.5, 26], lines: [[1.5, 'lamp', 'Mind the forty-first tread. It always did creak.', 'cp_m14_75'], [5, 'rchmate', 'Who’s that up there?', 'cp_m14_76']], f(t, k) { RCH.climb = k * 5.2; } },
  { d: 4.5, cam: [10, 30, 22], look: [0, 1.5, 27], lines: [[0.4, 'lamp', 'Who else would it be? Come up. The glass is clean.', 'cp_m14_77']], f() { RCH.climb = 5.2; } },
] });

// ---------- the lantern room ----------
cpCineDef('m14_lens', { music: 'cpm14keep', exit: rchCineEnd, shots: [
  { d: 5.5, cam: [3.5, -4.5, 1.6], to: [2.6, -3.0, 1.6], look: [2.6, -0.1, 1.5], fade: [1, 0], lines: [[0.5, 'lamp', 'I ground this glass in eighteen forty-one. I never once saw it lit from the outside.', 'cp_m14_80']], f() { RCH.cineAt = { lamp: { x: 2.6, y: -0.1, h: Math.PI + 0.4 } }; } },
  { d: 5.5, cam: [3.4, 2.4, 1.6], to: [3.7, 3.1, 1.5], look: [4.3, 3.5, 0.8], lines: [[0.4, 'lamp', 'Holm kept her through the worst year there ever was. He left you his book.', 'cp_m14_81']], f() { RCH.cineAt = { lamp: { x: 2.6, y: -0.1, h: 0.6 } }; } },
  { d: 6, cam: [0, -5.5, 1.7], to: [0, -9.2, 1.8], look: [0, -200, -20], lines: [[0.4, 'lamp', 'Whoever holds the rock, they call the Keeper. Holding it was never the trick of it.', 'cp_m14_82']], f() { RCH.cineAt = { lamp: { x: 2.6, y: -0.1, h: Math.PI } }; } },
] });

// ---------- Keepers ----------
cpCineDef('m14_keepers', { music: 'cpm14keep', exit: rchCineEnd, shots: [
  { d: 6, cam: [24, -30, 6], to: [30, -10, 10], look: [0, 1.5, 3], lines: [[0.6, 'rchmate', 'Look at it. Every shore it touches, they sink back.', 'cp_m14_86']], f(t) { RCH.lensK = 1; RCH.lensA = wrapPi(t * 1.2); } },
  { d: 7, cam: [0, -6, 2.2], to: [0, -9, 2.6], look: [0, -400, -10], lines: [[0.8, 'rchmate', 'They’re dipping their beacons. All of them. Every nation in the Reach.', 'cp_m14_87']], f(t, k) { RCH.lensK = 1; RCH.lensA = wrapPi(3 + t * 1.0); RCH.dip = k; } },
  { d: 5.5, cam: [4.2, -2.6, 1.6], look: [2.6, -0.1, 1.6], lines: [[0.4, 'lamp', 'That’s all the name of Keeper ever was. Keeping it lit. It’s yours now.', 'cp_m14_88']], f(t) { RCH.lensK = 1; RCH.lensA = wrapPi(1 + t * 1.0); RCH.dip = 1; RCH.cineAt = { lamp: { x: 2.6, y: -0.1, h: Math.PI + 0.6 } }; } },
  { d: 4.5, card: { eye: 'The Drowned Reach', t: 'Keepers of the Light', sub: 'Whoever holds the rock is called the Keeper' } },
] });

// ---------- the epilogue ----------
const RCH_TALES = [['Fog Run', 'Autumn 1889'], ['The First Fire', 'c. 1200s'], ['The Kittiwake', '28 February 1888'], ['Lighting the Light', '1841'], ['The Fall of Wrackhaven', 'Winter 1891'], ['The Wren Comes In', '9 January 1888'], ['The Night of the Gannet', '14 December 1887']];
cpCineDef('m14_outro', { music: 'cpm14end', exit: rchCineEnd,
  b3(grp, C) {
    const G0 = FPSC.GROUND, D = -ZMT.L[5], [cx, cy] = rchW(RCHG.C[0], RCHG.C[1]);
    // the Gannet, on the skerries: her broken hull, her masts gone by the board
    { const [x, y] = [cx - 130, cy - 150], g2 = new THREE.Group(); g2.position.copy(z3v(x, y, G0 + D)); g2.rotation.set(0.12, 0.7, 0.18); grp.add(g2); const h = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 22), z3Lam('#14161a')); h.position.y = 0.4; g2.add(h); const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 6), z3Lam('#1e1a16')); m1.position.set(0, 4, 3); m1.rotation.z = 0.5; g2.add(m1); for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + i, 0), z3Lam('#101214')); r.position.set(-10 + i * 5, -1, -8 + i * 3); g2.add(r); } C.gannet = [x, y]; }
    // Maren in her skiff, rowing out towards her, her lantern lit
    { const [x, y] = [cx - 70, cy - 85], g2 = C.skiff = new THREE.Group(); g2.position.copy(z3v(x, y, G0 + D + 0.1)); grp.add(g2); const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3.6, 10, 1, true, Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ color: 0x2a3a42, side: THREE.DoubleSide })); hl.rotation.x = Math.PI / 2; hl.scale.set(1.2, 1, 0.9); g2.add(hl); const mar = C.mar = rchImgSprite(IMG.maren, 2.0); mar.position.y = 0.1; g2.add(mar); const lan = new THREE.Sprite(rchSoft('rgba(255,220,150,1)', 'rgba(255,200,120,0)')); lan.scale.setScalar(2.2); lan.position.set(0.5, 0.9, -1.2); g2.add(lan); const L = new THREE.PointLight(0xffd090, 1.6, 14, 1.3); L.position.set(0.5, 1, -1.2); g2.add(L); C.sk = [x, y]; }
  },
  shots: [
    { d: 4.5, card: { eye: 'Undated', t: 'The last page of the log', sub: 'In the keeper’s hand' } },
    { d: 7.5, cam: [3.6, 2.6, 1.5], to: [4.0, 3.2, 1.25], look: [4.3, 3.5, 0.85], lines: [[0.4, 'log', 'If you are reading this, keep Plimsoll close and keep the bell ready.', 'cp_m14_91'], [3.8, 'log', 'Whatever sea you wake on, the light is still turning, and she is still rowing out to the Gannet.', 'cp_m14_92']], f(t) { RCH.lensK = 1; RCH.lensA = wrapPi(t * 0.97); } },
    ...RCH_TALES.map(([t, s], i) => ({ d: 1.6, card: { eye: 'The tales', t, sub: s }, fade: [0.25, 0.25], lines: i === 0 ? [[0.2, 'log', 'The tales don’t keep to their order. They never did. They come round again, as regular as the lamp.', 'cp_m14_93']] : [] })),
    { d: 2.4, card: { eye: 'The tales', t: 'The Drowned Reach', sub: 'The years after' }, fade: [0.3, 0.6] },
    { d: 8, cam: [-4, -8.8, 2.4], to: [-6.5, -8.0, 2.6], look: [-70, -85, -25], sfx: [[0.3, 'rchoar', 0.35]], lines: [[0.6, 'log', 'She was out there, rowing toward where the Gannet was, and the lantern in her skiff was still lit.', 'cp_m14_94']],
      f(t, k, C) { RCH.lensK = 1; RCH.lensA = wrapPi(-2.6 + t * 0.97); if (C.skiff) { const x = C.sk[0] - 14 * k, y = C.sk[1] - 15 * k; C.skiff.position.copy(z3v(x, y, FPSC.GROUND - ZMT.L[5] + 0.1 + (reduceMotion ? 0 : Math.sin(t * 1.4) * 0.06))); C.skiff.rotation.y = 0.75; } } },
    { d: 6, cam: [-62, -78, -21], to: [-66, -84, -22], look: [-75, -92, -24.4], sfx: [[0.2, 'rchoar', 0.7]], lines: [[1.4, 'log', 'When the lamp turned, she looked up at me.', 'cp_m14_95']],
      f(t, k, C) { RCH.lensK = 1; RCH.lensA = wrapPi(-2.6 + 8 * 0.97 + t * 0.97); if (C.skiff) { const x = C.sk[0] - 14 - 6 * k, y = C.sk[1] - 15 - 6 * k; C.skiff.position.copy(z3v(x, y, FPSC.GROUND - ZMT.L[5] + 0.1)); } if (C.mar && t > 1.4 && !C.up) { C.up = 1; C.mar.material.map = gwsImgTex(IMG.maren, false, true) || C.mar.material.map; C.mar.material.needsUpdate = true; } } },
    { d: 6, card: { eye: 'The Chronicle of the Light', t: 'The light is still turning', sub: 'And she is still rowing out to the Gannet' }, fade: [1.2, 1.5] },
  ] });
