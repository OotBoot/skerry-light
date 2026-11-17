'use strict';
// The Chronicle of the Light, mission 8: The Gannet's Wake (14 December 1888). A year to the night after the brig
// broke up on the skerries, her bell is heard again; the keeper lights the lamp and stands on the gallery till dawn,
// and his cutter goes out after the bell with a lantern on the water ahead of it. Told from the Light's side this
// time, where the raid tells it from the cutter's: the north landing first, then her lantern out to the ring of
// spars, then the Gannet's own deck by flarelight.
//  I.   The North Landing (cp_m08rock, src/cpm08a.js): the back of the Light's rock, where the cutter is kept on her
//       slip. Carry the flares, the grapnel and line and the lamp oil down to her while the drowned climb out of the
//       gully; Holm lights the lamp (m08_gallery) and sees a lantern on the water; knock out the chocks.
//  II.  Her Lantern (cp_m08out, src/cpm08b.js): on the raid's own sea (gwsail through GWS_LEG), following Maren's
//       skiff out, answering the Gannet's bell with the cutter's; the ring of spars (m08_ring); fire flares into her
//       four tall spars and she comes up alongside (m08_board, after the part).
//  III. By Flarelight (cp_m08deck, src/cpm08c.js): her weather deck (the Quarterdeck's stage underneath). The Bosun
//       up out of the hatch with Knock loose on the deck behind you; Crane (m08_crane) under his black sail from the
//       start, its halyards to cut; Maren's lantern under the port rail at the last (m08_maren); the outro.
// Lines: cp_m08_01 on (the table in campaign-sound/m08.md).

cpCast('m8cox', { n: 'The Coxswain', c: '#b8d0c0' });
CP_MUSIC_FALL.cpm08rock = 'gwhold';    // (the north landing, the bell far out: slow and cold)
CP_MUSIC_FALL.cpm08sail = 'gwsail';    // (following her lantern out)
CP_MUSIC_FALL.cpm08rise = 'gwsail';    // (the Gannet coming up)
CP_MUSIC_FALL.cpm08deck = 'gwhold';    // (the waist in the dark: Knock and the Bosun)
CP_MUSIC_FALL.cpm08crane = 'gwcapt2';  // (Crane by flarelight)
CP_MUSIC_FALL.cpm08last = 'gwcapt2';   // (her lantern)
CP_MUSIC_FALL.cpm08end = 'cpsad';      // (she goes down)

cpMission({ id: 'm08', act: 3, n: "The Gannet's Wake", when: '14 December 1888', where: 'Skerry Light, and aboard the risen Gannet',
  blurb: "A year to the night, the Gannet's bell. Ready the cutter under the Light, follow a lantern out to her spars, and face her crew by flarelight.",
  stages: ['cp_m08rock', 'cp_m08out', 'cp_m08deck'], intro: 'm08_intro', outro: 'm08_outro',
  cut: { 1: 'm08_sea' }, after: { 1: 'm08_board' }, music: { default: 'cpm08sail' }, lives: 1,
  stop() { if (typeof GWS_LEG !== 'undefined' && GWS_LEG && GWS_LEG.key === 'cpm08out') GWS_LEG = null; } });

// ---------- the cinematics ----------
// a sea point (a sail stage, frozen for a cinematic), in deck coordinates about the island's middle
function cpm8SeaL(sx, sy) { return typeof cpm5SeaL === 'function' ? cpm5SeaL(sx, sy) : [0, 60]; }
// the opening: the north landing, the Light over it, the bell a mile out, Holm at the tower door
cpCineDef('m08_intro', {
  music: 'cpm08rock',
  b3(grp, C) { C.holm = cpkNpc(['#1e2436', '#d8d0bc', '#8a7a4a', '#ffd88a']); C.rang = 0; },
  exit(C) { cpkNpcFree(C.holm); },
  shots: [
    cpTitleShot(CP_BY.m08),
    { d: 4.2, card: { eye: 'The keeper’s log', t: '14 December 1888', sub: 'A year to the night. The north landing, under Skerry Light' } },
    { d: 6.5, cam: [34, 62, 10], to: [20, 44, 7], look: [0, -30, 34], lookTo: [0, -30, 26], fade: [1, 0],
      f(t, k, C) { if (t > 2.5 && !C.rang) { C.rang = 1; try { if (!soundOff()) sfxBellFar(0.4, 0.5); } catch (e) {} } },
      lines: [[0.4, 'log', 'A year tonight. At the change of the watch we heard the Gannet’s bell, out past the rocks.', 'cp_m08_01']] },
    { d: 5.5, cam: [-5, -2, 2.2], to: [-3.5, -5, 2.0], look: [1.5, -14.8, 1.7],
      f(t, k, C) { const [x, y] = cpkW(1.5, -14.8); cpkNpcPose(C.holm, { x, y, h: 0.2, lan: true }); },
      lines: [[0.3, 'holm', 'Her bell. A mile out, where she broke up. A year to the night.', 'cp_m08_02'], [3.2, 'holm', 'I’ll light the lamp and keep it. You get the cutter ready.', 'cp_m08_03']] },
    { d: 5.5, cam: [6, 14, 3.2], to: [4, 20, 2.8], look: [0, 38, 1.0], lookTo: [0, 40, 1.2],
      f(t, k, C) { const [x, y] = cpkW(1.5, -14.8); cpkNpcPose(C.holm, { x, y, h: 0.2, lan: true }); },
      lines: [[0.3, 'm8cox', 'Flares, the grapnel and line, and oil for her lamps. Down to the slip with them, lads.', 'cp_m08_04']] },
  ],
});
// the lamp lit: Holm on the gallery, and a lantern out on the water rowing north
cpCineDef('m08_gallery', {
  music: 'cpm08rock',
  b3(grp, C) {
    C.holm = cpkNpc(['#1e2436', '#d8d0bc', '#8a7a4a', '#ffd88a']);
    const soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'); C.sk = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.9 }));
    C.sk.scale.setScalar(6); const [x, y] = cpkW(-46, 190); C.sk.position.copy(z3v(x, y, FPSC.GROUND - 0.6)); grp.add(C.sk); C.skx = x; C.sky = y;
  },
  exit(C) { cpkNpcFree(C.holm); },
  shots: [
    { d: 5.5, cam: [9, -16, 38], to: [7, -19, 37.2], look: [0, -26.4, 36.8], fade: [0.6, 0],
      f(t, k, C) { const [x, y] = cpkW(0, -26.4); cpkNpcPose(C.holm, { x, y, jz: 35.25, h: 0, lan: true }); },
      lines: [[0.4, 'holm', 'The lamp is lit. And there’s another light on the water, and it isn’t mine.', 'cp_m08_08']] },
    { d: 6.5, cam: [0.8, -27.4, 37.1], to: [0.6, -27.0, 37.0], look: [-46, 190, 0], lookTo: [-48, 198, 0],
      f(t, k, C) { const [x, y] = cpkW(0, -26.4); cpkNpcPose(C.holm, { x, y, jz: 35.25, h: -0.2, lan: true }); C.sk.position.x = C.skx - t * 0.6; C.sk.position.z = -(C.sky + t * 1.4); C.sk.material.opacity = 0.75 + 0.2 * Math.sin(t * 7); },
      lines: [[0.4, 'log', 'She was out there, rowing toward where the Gannet was, and the lantern in her skiff was still lit.', 'cp_m08_09']] },
    { d: 5, cam: [3, 12, 1.8], to: [2.5, 10, 2.2], look: [0, -26, 36],
      f(t, k, C) { const [x, y] = cpkW(0, -26.4); cpkNpcPose(C.holm, { x, y, jz: 35.25, h: 0, lan: true }); },
      lines: [[0.3, 'holm', 'Maren! Follow her lantern. Knock the chocks out and go!', 'cp_m08_10']] },
  ],
});
// at sea: the cutter out from under the Light, the lantern low on the water ahead
cpCineDef('m08_sea', {
  music: 'cpm08sail',
  b3(grp, C) {
    const S = RAID.st, K = S && S.m8k; const [u, v] = K ? cpm8SeaL(K.x, K.y) : [0, 80];
    C.sk = [u, v, 0.8]; this.shots[1].look = C.sk; this.shots[1].lookTo = C.sk; this.shots[2].look = C.sk;
    const [lu, lv] = cpm8SeaL(0, 0); this.shots[0].look = [lu, lv, 30];
  },
  shots: [
    { d: 5, cam: [0.8, -10.4, 2.9], to: [0.4, -10.8, 3.1], look: [0, -200, 30], fade: [0.8, 0],
      lines: [[0.4, 'log', 'I sent the cutter out, and stood on the gallery to watch her go.', 'cp_m08_13']] },
    { d: 5.5, cam: [-1.8, 11.4, 4.6], to: [-1.5, 12, 4.3], look: [0, 80, 0.8],
      lines: [[0.4, 'm8cox', 'There. A lantern, low on the water, and a skiff under it.', 'cp_m08_14']] },
    { d: 6, cam: [-2.6, 2, 2.8], to: [-2.2, 5, 3.2], look: [0, 80, 0.8],
      lines: [[0.3, 'm8cox', 'Keep her lantern over the bowsprit. When the Gannet tolls, answer with ours, or they’ll be up the sides.', 'cp_m08_33']] },
  ],
});
// the ring of her spars: the skiff stops in the middle of it, and the woman in it speaks
cpCineDef('m08_ring', {
  music: 'cpm08sail',
  b3(grp, C) {
    const S = RAID.st, K = S && S.m8k; const [u, v] = K ? cpm8SeaL(K.x, K.y) : [0, 60];
    this.shots[0].look = [u, v, 1.2]; this.shots[1].look = [u, v, 1.4]; this.shots[1].lookTo = [u, v, 1.0];
    const [mu, mv] = cpm8SeaL(GWS.MARK[0], GWS.MARK[1]); this.shots[2].look = [mu, mv, 6];
  },
  shots: [
    { d: 5, cam: [-1.8, 11.4, 4.4], to: [-1.4, 12, 4.1], look: [0, 60, 1.2], fade: [0.4, 0], sfx: [[0.6, 'whisper', 0.5]],
      lines: [[0.4, 'm8cox', 'The ring of her spars. The skiff’s stopped dead in the middle of it.', 'cp_m08_18']] },
    { d: 5.5, cam: [-1.4, 8, 2.4], to: [-1.0, 9.5, 2.2], look: [0, 60, 1.4],
      lines: [[0.6, 'maren', 'Light them. Light them, so they can see where she lies.', 'cp_m08_19']] },
    { d: 5, cam: [2.4, -2, 4.6], to: [2.0, 1, 4.2], look: [0, 60, 6],
      lines: [[0.3, 'm8cox', 'Four of them still carry their tops. A flare into each, from the forward deck.', 'cp_m08_34']] },
  ],
});
// the Gannet alongside, her bell ringing; her figurehead gone from her bow; up her side
cpCineDef('m08_board', {
  music: 'cpm08rise',
  b3(grp, C) { C.rang = 0; },
  shots: [
    { d: 5.5, cam: [2, 26, 6], to: [1.4, 22, 5.6], look: [-8, 0, 3], lookTo: [-8, -2, 3.2],
      f(t, k, C) { if (!C.rang) { C.rang = 1; try { if (!soundOff()) sfxBell(); } catch (e) {} } },
      lines: [[0.4, 'log', 'The Gannet came up alongside, inside the ring of her spars, the water pouring off her, and her bell was ringing.', 'cp_m08_22']] },
    { d: 5, cam: [-1.6, 11, 4.2], to: [-1.8, 11.8, 4.3], look: [-9.6, 16, 4.6], sfx: [[1.2, 'creak', 0.6]],
      lines: [[0.4, 'm8cox', 'Her figurehead’s gone from her bow. There’s nothing on the stem at all.', 'cp_m08_23']] },
    { d: 4.5, cam: [-3.2, -1, 2.2], to: [-6.4, 0, 6.0], look: [-9.6, 1, 7.5], fade: [0, 0.7],
      lines: [[0.3, 'm8cox', 'Up her side, all of you. I’ll hold the cutter off.', 'cp_m08_24']] },
  ],
});
// the Bosun down: Crane comes up through his deck by the wheel, his black sail already up between her and the Light
cpCineDef('m08_crane', {
  music: 'cpm08crane',
  b3(grp, C) {
    C.cr = typeof gcBuildCrane === 'function' ? gcBuildCrane() : null;
    if (C.cr) { grp.add(C.cr.root); const [x, y] = cpkW(...GC_RISE); C.cx = x; C.cy = y; C.cr.root.position.copy(z3v(x, y, FPSC.GROUND + GCC.QD - 4.6)); C.cr.root.rotation.y = 0; }
    GCW.sail = 0; C.rose = 0;
  },
  exit(C) { if (C.cr && C.cr.root.parent) C.cr.root.parent.remove(C.cr.root); },
  shots: [
    { d: 5, cam: [3, 2, 1.9], to: [2.4, -2, 2.1], look: [0, -14.8, 2.4], lookTo: [0, -14.8, 3.6], shake: 0.25,
      f(t, k, C) { if (C.cr) { const e = zbE(Math.min(1, t / 4.4)); C.cr.root.position.y = FPSC.GROUND + GCC.QD - 4.6 * (1 - e); } if (t > 0.3 && !C.rose) { C.rose = 1; try { gcSound('rise', 8); } catch (e) {} } },
      lines: [[0.6, 'crane', 'Who comes aboard my ship without leave?', 'cp_m08_27']] },
    { d: 5, cam: [-2, -6, 2.4], to: [-1.6, -7.4, 2.6], look: [0, -14.8, 4.0],
      f(t, k, C) { if (C.cr) C.cr.root.position.y = FPSC.GROUND + GCC.QD; },
      lines: [[0.4, 'crane', 'Douse that Light. Hoist the black!', 'cp_m08_28']] },
    { d: 5, cam: [3.8, 6, 2.6], to: [3.2, 2, 3.2], look: [-5.5, 3.5, 7], lookTo: [-5.5, 3.5, 11],
      f(t, k, C) { GCW.sail = zbE(Math.min(1, t / 3.6)); if (C.cr) C.cr.root.position.y = FPSC.GROUND + GCC.QD; },
      sfx: [[0.3, 'creak', 0.8]], lines: [[0.8, 'm8cox', 'A black sail, up her port side. The Light’s cut off the deck!', 'cp_m08_32']] },
  ],
});
// a third of his strength left: her skiff under the port rail, her lantern lifted, and the black sail takes fire
cpCineDef('m08_maren', {
  music: 'cpm08last',
  b3(grp, C) { C.burnt = 0; },
  shots: [
    { d: 5, cam: [-3.6, 0, 2.6], to: [-4.2, 1.5, 2.4], look: [-9.5, 2, -2.2], fade: [0.4, 0], sfx: [[0.3, 'whisper', 0.6]],
      lines: [[0.4, 'm8cox', 'Her skiff, under the port rail! And her lantern lifted up to him!', 'cp_m08_42']] },
    { d: 5.5, cam: [-6.6, 4.5, 0.4], to: [-6.8, 3.8, 0.2], look: [-9.5, 2, -1.2],
      lines: [[0.5, 'maren', 'I came to warn you. I came too late, and I have come every year since.', 'cp_m08_36']] },
    { d: 5, cam: [2, 8, 2.0], to: [1.4, 6, 2.6], look: [-5.5, 3.5, 8], lookTo: [-5.5, 3.5, 4],
      f(t, k, C) { GCW.sail = Math.max(0, 1 - t / 3.8); },
      get sfx() { return [[0.6, sfxHas('sailfire') ? 'sailfire' : 'tear', 0.7]]; }, lines: [[0.4, 'crane', 'Who carries that lantern? Who is that, on my water?', 'cp_m08_37']] },
  ],
});
// he falls: the Gannet goes down under them all, and the keeper's page
cpCineDef('m08_outro', {
  music: 'cpm08end',
  b3(grp, C) { C.fd0 = GCW.fd || 0; },
  shots: [
    { d: 5.5, cam: [2, -8, 2.0], to: [1.4, -10, 2.4], look: [0, -15, 0.6], fade: [0.5, 0],
      f(t, k, C) { GCW.fd = Math.min(1, C.fd0 + t / 8); },
      lines: [[0.4, 'crane', 'Let her go, then. Let her go down, and me with her.', 'cp_m08_38']] },
    { d: 6, cam: [-4.2, 2, 2.6], to: [-4.4, 4, 2.2], look: [-60, 30, 20], lookTo: [-300, 110, 30],
      f(t, k, C) { GCW.fd = 1; },
      lines: [[0.4, 'm8cox', 'Over the side, all of you, and into the cutter! She’s going!', 'cp_m08_39']] },
    { d: 6.5, cam: [-46, -30, 3], to: [-52, -34, 2.6], look: [0, 0, 1], fade: [0, 1], shake: 0.1,
      f(t, k, C) { GCW.fd = 1; },
      lines: [[0.4, 'log', 'I lit the lamp myself and stood on the gallery until dawn.', 'cp_m08_40'], [3.4, 'log', 'When the lamp turned, she looked up at me.', 'cp_m08_41']] },
    { d: 10, card: { eye: 'The keeper’s log · 14 December 1888', t: "The Gannet's Wake", sub: 'A year tonight. I lit the lamp myself and stood on the gallery until dawn. She was out there, rowing toward where the Gannet was, and the lantern in her skiff was still lit. When the lamp turned, she looked up at me.' } },
  ],
});
