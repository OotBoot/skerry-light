// Crew connection for copies of the game hosted on your own website.
//
// Talks to server/server.js over a WebSocket and offers the same calls the game uses from the
// claude.ai room: presence(patch) to publish your own state, onPeers(handler) to hear everyone's,
// and connected(). If the connection drops (a flaky phone signal, or the free server restarting),
// it keeps reconnecting in the background and re-sends your state, so a crew carries on.
// Resolves null when no server answers at first, and the game then plays solo.

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
    let ws = null, me = null, local = {}, sendTimer = 0, frameQueued = false;
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
    const flush = () => {
      sendTimer = 0;
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'presence', presence: local }));
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
          me = m.peer; retry = 0;
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
