// A minimal WebSocket server (RFC 6455) using only Node's standard library, so the crew server
// needs no npm packages. It supports what the game uses: text messages, ping/pong and close.
// Messages larger than maxPayload, binary frames and fragmented messages close the connection.

import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class LiteSocket extends EventEmitter {
  constructor(socket, maxPayload) {
    super();
    this.socket = socket;
    this.maxPayload = maxPayload;
    this.readyState = 1; // 1 open, 2 closing, 3 closed
    this.buf = Buffer.alloc(0);
    socket.setNoDelay(true);
    socket.on('data', d => this._onData(d));
    socket.on('close', () => this._closed());
    socket.on('end', () => this._closed());
    socket.on('error', () => this._closed());
  }

  send(text) {
    if (this.readyState !== 1) return;
    this._frame(0x1, Buffer.from(String(text), 'utf8'));
  }
  ping() { if (this.readyState === 1) this._frame(0x9, Buffer.alloc(0)); }
  close(code = 1000, reason = '') {
    if (this.readyState !== 1) return;
    const r = Buffer.from(reason, 'utf8').subarray(0, 120);
    const body = Buffer.alloc(2 + r.length);
    body.writeUInt16BE(code, 0); r.copy(body, 2);
    this._frame(0x8, body);
    this.readyState = 2;
    setTimeout(() => this.terminate(), 1000).unref();
  }
  terminate() { try { this.socket.destroy(); } catch (e) {} this._closed(); }

  _frame(opcode, payload) {
    const len = payload.length;
    let head;
    if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
    else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    head[0] = 0x80 | opcode;
    try { this.socket.write(Buffer.concat([head, payload])); } catch (e) { this._closed(); }
  }

  _onData(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, opcode = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) {
        if (this.buf.length < 10) return;
        const big = this.buf.readBigUInt64BE(2);
        if (big > BigInt(this.maxPayload)) { this.close(1009, 'Message too big'); return; }
        len = Number(big); off = 10;
      }
      if (!masked) { this.close(1002, 'Client frames must be masked'); return; }
      if (len > this.maxPayload) { this.close(1009, 'Message too big'); return; }
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4);
      const data = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);

      if (opcode === 0x8) { this.close(); this.terminate(); return; }
      if (opcode === 0x9) { this._frame(0xA, data); continue; }
      if (opcode === 0xA) { this.emit('pong'); continue; }
      if (opcode !== 0x1 || !fin) { this.close(1003, 'Only whole text messages are accepted'); return; }
      this.emit('message', data);
    }
  }

  _closed() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
  }
}

// Attach to an http.Server; calls onConnection(socket) for each upgrade to `path`.
export function attachWebSocket(server, path, maxPayload, onConnection) {
  server.on('upgrade', (req, socket) => {
    const url = (req.url || '').split('?')[0];
    const key = req.headers['sec-websocket-key'];
    const upgrade = String(req.headers.upgrade || '').toLowerCase();
    if (url !== path || upgrade !== 'websocket' || typeof key !== 'string' || !key) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return;
    }
    const accept = createHash('sha1').update(key + GUID).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    onConnection(new LiteSocket(socket, maxPayload));
  });
}
