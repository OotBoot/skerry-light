// Crew connection for copies of the game hosted on your own website.
//
// Talks to server/server.js over a WebSocket and offers the same two calls the game uses from the
// claude.ai room: presence(patch) to publish your own state, and onPeers(handler) to hear everyone's.
// Resolves null when no server answers, and the game then plays solo.

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
    let ws;
    try { ws = new WebSocket(url); } catch (e) { resolve(null); return; }
    const peers = new Map(), handlers = [], errHandlers = [];
    let me = null, settled = false, local = {}, sendTimer = 0, frameQueued = false;

    const finish = v => { if (!settled) { settled = true; clearTimeout(timeout); resolve(v); } };
    const timeout = setTimeout(() => { try { ws.close(); } catch (e) {} finish(null); }, 6000);

    const snapshot = () => [...peers.values()].map(p => Object.assign({}, p, { isMe: p.peer === me, sameTab: p.peer === me }));
    const deliver = () => {
      frameQueued = false;
      const arr = snapshot();
      for (const h of handlers) { try { h({ peers: arr, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } }
    };
    const schedule = () => { if (!frameQueued) { frameQueued = true; requestAnimationFrame(deliver); } };
    const entry = (peer, presence) => ({ peer, by: null, kind: 'viewer', guest: false, presence: presence || {}, updatedAt: Date.now() });

    const flush = () => {
      sendTimer = 0;
      if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'presence', presence: local }));
    };

    const api = {
      presence(patch) {
        for (const k in patch) { if (patch[k] === null) delete local[k]; else local[k] = patch[k]; }
        if (me) { peers.set(me, entry(me, Object.assign({}, local))); schedule(); }
        if (!sendTimer) sendTimer = setTimeout(flush, 50);
        return Promise.resolve();
      },
      onPeers(handler, onError) {
        handlers.push(handler);
        if (onError) errHandlers.push(onError);
        setTimeout(schedule, 0);
        return () => { const i = handlers.indexOf(handler); if (i >= 0) handlers.splice(i, 1); };
      },
      peers: snapshot,
      connected: () => ws.readyState === 1,
    };

    ws.onmessage = ev => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'hello' && typeof m.peer === 'string') {
        me = m.peer;
        if (Array.isArray(m.peers)) for (const p of m.peers) if (p && typeof p.peer === 'string') peers.set(p.peer, entry(p.peer, p.presence));
        peers.set(me, entry(me, Object.assign({}, local)));
        finish(api);
        schedule();
      } else if (m.t === 'state' && typeof m.peer === 'string' && m.peer !== me) {
        peers.set(m.peer, entry(m.peer, m.presence && typeof m.presence === 'object' ? m.presence : {}));
        schedule();
      } else if (m.t === 'leave' && typeof m.peer === 'string') {
        peers.delete(m.peer);
        schedule();
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (!settled) { finish(null); return; }
      for (const e of errHandlers) { try { e({ code: 'revoked', message: 'The crew server closed the connection.' }); } catch (err) {} }
    };
  });
}
