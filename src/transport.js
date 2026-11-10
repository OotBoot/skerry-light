// Crew connection for copies of the game hosted on your own website.
//
// Talks to server/server.js over a WebSocket and offers the same calls the game uses from the
// claude.ai room: presence(patch) to publish your own state, onPeers(handler) to hear everyone's,
// and connected(). If the connection drops (a flaky phone signal, or the free server restarting),
// it keeps reconnecting in the background and re-sends your state, so a crew carries on.
// Resolves null when no server answers at first, and the game then plays solo.
//
// To spare the connection, only what changed is sent: after the first whole copy, each send is a patch of the keys
// (and, for a key holding an object, the keys inside it) that differ from what was sent last, and the server passes
// patches on the same way to everyone it knows has the rest. A lighthouse night's host repeats most of its message
// (the round, the boards, the chest, the feed) from one tenth of a second to the next, so this is most of the saving.

function crewServerUrl() {
  let url = '';
  try { url = new URLSearchParams(location.search).get('server') || ''; } catch (e) {}
  if (!url) url = SK.SERVER || '';
  if (!url && (location.protocol === 'http:' || location.protocol === 'https:')) {
    url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  }
  if (url && !/^wss?:\/\//.test(url)) return '';
  return url;
}

function wsTransport(url) {
  return new Promise(resolve => {
    const peers = new Map(), handlers = [], connHandlers = [];
    let ws = null, me = null, local = {}, sendTimer = 0, frameQueued = false, sent = null, patches = false, wholeAt = 0;
    let settled = false, open = false, retry = 0;

    const entry = (peer, presence) => ({ peer, by: null, kind: 'viewer', guest: false, presence: presence || {}, updatedAt: Date.now() });
    const snapshot = () => [...peers.values()].map(p => Object.assign({}, p, { isMe: p.peer === me, sameTab: p.peer === me }));
    const deliver = () => {
      frameQueued = false;
      const arr = snapshot();
      for (const h of handlers) { try { h({ peers: arr, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } }
    };
    // deliver on a timer as well as on frames, so a background tab still keeps its crew up to date
    const schedule = () => { if (!frameQueued) { frameQueued = true; setTimeout(deliver, 50); } };
    const setOpen = v => { if (open === v) return; open = v; for (const h of connHandlers) { try { h(v); } catch (e) {} } };
    // what was last sent, as text, key by key and down into objects (to DEPTH: a lighthouse host's drowned sit at
    // zm.z.<id>), to tell what has changed. A patch: d, what's new or changed (an object there is gone into, key by
    // key, down to DEPTH), and x, the paths of whatever was taken away.
    const flush = () => {
      sendTimer = 0;
      if (!ws || ws.readyState !== 1) return;
      const now = wsPatchPrint(local, 0);
      // (and a whole copy every few seconds all the same, so anything that went astray is put right)
      if (!sent || !patches || Date.now() - wholeAt > 5000) { ws.send(JSON.stringify({ t: 'presence', presence: local, v: 2 })); sent = now; wholeAt = Date.now(); return; }
      const x = [], d = wsPatchDiff(now, sent, local, [], x);
      sent = now;
      if (d === undefined && !x.length) return;
      const msg = { t: 'patch' };
      if (d !== undefined) msg.d = d;
      if (x.length) msg.x = x;
      ws.send(JSON.stringify(msg));
    };

    const api = {
      presence(patch) {
        for (const k in patch) { if (patch[k] === null) delete local[k]; else local[k] = patch[k]; }
        if (me) { peers.set(me, entry(me, Object.assign({}, local))); schedule(); }
        if (!sendTimer) sendTimer = setTimeout(flush, 50);
        return Promise.resolve();
      },
      onPeers(handler) {
        handlers.push(handler);
        setTimeout(schedule, 0);
        return () => { const i = handlers.indexOf(handler); if (i >= 0) handlers.splice(i, 1); };
      },
      onConnection(handler) { connHandlers.push(handler); setTimeout(() => handler(open), 0); return () => {}; },
      peers: snapshot,
      connected: () => open,
    };

    const connect = () => {
      try { ws = new WebSocket(url); } catch (e) { if (!settled) { settled = true; resolve(null); } return; }
      const firstTimeout = settled ? 0 : setTimeout(() => { try { ws.close(); } catch (e) {} if (!settled) { settled = true; resolve(null); } }, 6000);
      ws.onmessage = ev => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m || typeof m !== 'object') return;
        if (m.t === 'hello' && typeof m.peer === 'string') {
          clearTimeout(firstTimeout);
          me = m.peer; retry = 0; sent = null; patches = m.v >= 2;   // (an older server only takes whole copies)
          peers.clear();
          if (Array.isArray(m.peers)) for (const p of m.peers) if (p && typeof p.peer === 'string') peers.set(p.peer, entry(p.peer, p.presence));
          peers.set(me, entry(me, Object.assign({}, local)));
          setOpen(true);
          flush();
          if (!settled) { settled = true; resolve(api); }
          schedule();
        } else if (m.t === 'state' && typeof m.peer === 'string' && m.peer !== me) {
          peers.set(m.peer, entry(m.peer, m.presence && typeof m.presence === 'object' ? m.presence : {}));
          schedule();
        } else if (m.t === 'patch' && typeof m.peer === 'string' && m.peer !== me) {
          // what changed of someone whose whole state we already have (the server sends that first)
          const old = peers.get(m.peer); if (!old) return;
          const pr = wsPatchApply(old.presence, m);
          if (pr) peers.set(m.peer, entry(m.peer, pr));
          schedule();
        } else if (m.t === 'leave' && typeof m.peer === 'string') {
          peers.delete(m.peer);
          schedule();
        }
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        clearTimeout(firstTimeout);
        if (!settled) { settled = true; resolve(null); return; }
        setOpen(false);
        // try again: 1 s, 2 s, 4 s ... up to every 15 s
        const wait = Math.min(15000, 1000 * 2 ** retry++);
        setTimeout(connect, wait);
      };
    };
    connect();
  });
}

// ---------- patches (the server, server/server.js, has the same three) ----------
const WS_PATCH_DEPTH = 3;
const wsPatchObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
// each value as text, objects gone into down to WS_PATCH_DEPTH
function wsPatchPrint(v, depth) {
  if (!wsPatchObj(v) || depth >= WS_PATCH_DEPTH) return JSON.stringify(v === undefined ? null : v);
  const o = {}; for (const k in v) if (v[k] !== undefined) o[k] = wsPatchPrint(v[k], depth + 1); return o;
}
// what of now (with its values in val) differs from was: undefined if nothing; paths taken away go into x
function wsPatchDiff(now, was, val, path, x) {
  if (typeof now === 'string') return now === was ? undefined : val;
  if (typeof was !== 'object') return val;   // (wasn't an object before: the whole of it)
  let d;
  for (const k in now) { const c = wsPatchDiff(now[k], was[k], val[k], path.concat(k), x); if (c !== undefined) (d = d || {})[k] = c; }
  for (const k in was) if (!(k in now)) x.push(path.concat(k));
  return d;
}
// a patch onto a state: a new object (the old one left as it was), or null if the patch is malformed
function wsPatchApply(old, m) {
  const set = (o, d, depth) => {
    const out = wsPatchObj(o) ? Object.assign({}, o) : {};
    for (const k of Object.keys(d)) {
      if (k === '__proto__') return null;
      const v = d[k];
      if (wsPatchObj(v) && depth + 1 < WS_PATCH_DEPTH) { const c = set(out[k], v, depth + 1); if (!c) return null; out[k] = c; } else out[k] = v;
    }
    return out;
  };
  let out = wsPatchObj(m.d) ? set(old, m.d, 0) : Object.assign({}, old);
  if (!out) return null;
  if (Array.isArray(m.x)) for (const p of m.x) {
    if (!Array.isArray(p) || !p.length || p.length > WS_PATCH_DEPTH || p.some(k => typeof k !== 'string' || k === '__proto__')) return null;
    let o = out;
    for (let i = 0; i < p.length - 1 && o; i++) { if (!wsPatchObj(o[p[i]])) { o = null; break; } o[p[i]] = Object.assign({}, o[p[i]]); o = o[p[i]]; }
    if (o) delete o[p[p.length - 1]];
  }
  return out;
}
