// ency — zero-dependency server.
//
//   /            public page: the mesh, on whatever preset the studio published
//   /studio      the same mesh plus its dials; needs a session cookie
//   /api/*       preset read/write, email capture, unlock
//
// State lives in two files under DATA_DIR (a Railway volume in production):
// emails.jsonl is append-only, preset.json is the published mesh settings.
// That's deliberately the smallest thing that works — see README for when to
// outgrow it.

import http from 'node:http';
import { readFile, appendFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 4720;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const EMAILS = path.join(DATA_DIR, 'emails.jsonl');
const PRESET = path.join(DATA_DIR, 'preset.json');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL = 7 * 24 * 3600 * 1000;

if (!ADMIN_PASSWORD) console.warn('⚠ ADMIN_PASSWORD unset — /studio is closed');
if (!process.env.SESSION_SECRET) console.warn('⚠ SESSION_SECRET unset — sessions drop on restart');

// ------------------------------------------------------------------ storage

const seen = new Set();   // lowercased emails, for dedupe without re-reading

async function initStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    for (const line of readFileSync(EMAILS, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { seen.add(JSON.parse(line).email); } catch { /* skip a torn line */ }
    }
  } catch { /* first run */ }
  console.log(`◈ ${seen.size} subscriber(s) loaded from ${DATA_DIR}`);
}

async function readPreset() {
  try { return JSON.parse(await readFile(PRESET, 'utf8')); } catch { return null; }
}

// ------------------------------------------------------------------ sessions

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(String(value)).digest('base64url');
}

function issueSession() {
  const exp = Date.now() + SESSION_TTL;
  return `${exp}.${sign(exp)}`;
}

function validSession(token) {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const exp = token.slice(0, dot), mac = token.slice(dot + 1);
  const want = sign(exp);
  // compare fixed-length digests so a mismatch can't be timed
  if (mac.length !== want.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return false;
  return Number(exp) > Date.now();
}

function passwordOk(supplied) {
  if (!ADMIN_PASSWORD || typeof supplied !== 'string') return false;
  // hash both sides first: equal-length inputs, so timingSafeEqual can't throw
  // and length itself doesn't leak
  const a = crypto.createHash('sha256').update(supplied).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const authed = req => validSession(cookies(req).ency_s);

function setCookie(res, req, value, maxAge) {
  const https = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  res.setHeader('Set-Cookie',
    `ency_s=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}` + (https ? '; Secure' : ''));
}

// ------------------------------------------------------------------ limits

const buckets = new Map();

// Deliberately in-memory: it resets on redeploy, which is fine because the
// password is the real control. Keeps the dependency count at zero.
function rateLimit(ip, key, max, windowMs) {
  const id = `${key}:${ip}`, now = Date.now();
  const b = buckets.get(id);
  if (!b || now > b.reset) { buckets.set(id, { n: 1, reset: now + windowMs }); return true; }
  if (b.n >= max) return false;
  b.n++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}, 60_000).unref();

const clientIp = req =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

// ------------------------------------------------------------------ helpers

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const chunks = [];
    req.on('data', c => {
      n += c.length;
      if (n > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveFile(res, name) {
  const abs = path.join(ROOT, path.normalize(name).replace(/^(\.\.[/\\])+/, ''));
  if (!abs.startsWith(ROOT)) return json(res, 403, { error: 'forbidden' });
  try {
    const data = await readFile(abs);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    json(res, 404, { error: 'not found' });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ------------------------------------------------------------------ routes

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;
  const ip = clientIp(req);

  try {
    // ---- pages
    if (p === '/' || p === '/index.html') return serveFile(res, 'index.html');

    if (p === '/studio' || p === '/studio.html') {
      if (!authed(req)) { res.writeHead(302, { Location: '/' }); return res.end(); }
      return serveFile(res, 'studio.html');
    }

    // ---- public API
    if (p === '/api/preset' && req.method === 'GET') {
      return json(res, 200, { preset: await readPreset() });
    }

    if (p === '/api/subscribe' && req.method === 'POST') {
      if (!rateLimit(ip, 'sub', 5, 60_000)) return json(res, 429, { error: 'slow down' });
      let email;
      try { email = JSON.parse(await readBody(req)).email; } catch { return json(res, 400, { error: 'bad request' }); }
      if (typeof email !== 'string') return json(res, 400, { error: 'bad request' });
      email = email.trim().toLowerCase();
      if (email.length > 254 || !EMAIL_RE.test(email)) return json(res, 400, { error: "that doesn't look like an email" });
      if (seen.has(email)) return json(res, 200, { ok: true, already: true });
      seen.add(email);
      // never logged, only written
      await appendFile(EMAILS, JSON.stringify({ email, ts: new Date().toISOString() }) + '\n');
      return json(res, 200, { ok: true });
    }

    if (p === '/api/unlock' && req.method === 'POST') {
      if (!rateLimit(ip, 'unlock', 8, 15 * 60_000)) return json(res, 429, { error: 'too many attempts' });
      let password;
      try { password = JSON.parse(await readBody(req)).password; } catch { return json(res, 400, { error: 'bad request' }); }
      if (!passwordOk(password)) return json(res, 401, { error: 'nope' });
      setCookie(res, req, issueSession(), SESSION_TTL / 1000);
      return json(res, 200, { ok: true });
    }

    // ---- gated API
    if (p === '/api/preset' && req.method === 'POST') {
      if (!authed(req)) return json(res, 401, { error: 'unauthorized' });
      let preset;
      try { preset = JSON.parse(await readBody(req)).preset; } catch { return json(res, 400, { error: 'bad request' }); }
      if (!preset || typeof preset !== 'object' || Array.isArray(preset)) return json(res, 400, { error: 'bad preset' });
      await writeFile(PRESET, JSON.stringify(preset, null, 2));
      return json(res, 200, { ok: true });
    }

    if (p === '/api/subscribers' && req.method === 'GET') {
      if (!authed(req)) return json(res, 401, { error: 'unauthorized' });
      let rows = [];
      try {
        rows = (await readFile(EMAILS, 'utf8')).split('\n').filter(Boolean)
          .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      } catch { /* none yet */ }
      return json(res, 200, { count: rows.length, subscribers: rows });
    }

    if (p === '/api/logout' && req.method === 'POST') {
      setCookie(res, req, '', 0);
      return json(res, 200, { ok: true });
    }

    // ---- static (ribbon.js and friends), never the data dir
    if (/^\/[\w.-]+\.(js|css|svg|png|ico|json)$/.test(p)) return serveFile(res, p.slice(1));

    return json(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('request failed:', err.message);
    if (!res.headersSent) json(res, 500, { error: 'server error' });
  }
});

await initStore();
server.listen(PORT, () => console.log(`◈ ency on http://localhost:${PORT}`));
