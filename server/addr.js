// Who sent a request: the visitor's own address, for the rate limits and the cap on connections.
// On Render the request comes through Cloudflare, which sets True-Client-IP (and CF-Connecting-IP) itself, so a
// visitor can't make it up. X-Forwarded-For is only added to, never cleared, so its first entry is whatever the
// visitor chose to send; it's used only if neither of Cloudflare's is there (so a host without Cloudflare still tells
// visitors apart rather than counting them all as its own proxy), and then the socket's own address.
export function clientAddr(req) {
  const h = req.headers || {};
  const one = v => String(v || '').split(',')[0].trim().slice(0, 64);
  return one(h['true-client-ip']) || one(h['cf-connecting-ip']) || one(h['x-forwarded-for']) || String((req.socket && req.socket.remoteAddress) || '');
}
