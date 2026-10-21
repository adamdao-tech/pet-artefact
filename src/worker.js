// ============================================================
//  Pet Artefakt Market – API
//
//  Veřejné:
//  GET  /api/market                 aktivní nabídky + poptávky + nedávno prodané
//  POST /api/listings               nová nabídka (multipart: data=JSON, img=screenshot)
//  POST /api/listings/:id           akce s editačním klíčem: sold | bump | edit | delete
//  POST /api/wanted                 nová poptávka (JSON)
//  POST /api/wanted/:id             akce s klíčem: bump | delete
//  POST /api/mine                   moje nabídky/poptávky podle klíčů (i prodané/vypršelé)
//  POST /api/report/:kind/:id       nahlásit (3 různá nahlášení = skryto)
//  POST /api/bugs                   nahlásit chybu webu
//  GET  /api/img/:id                screenshot nabídky
//
//  Admin (přihlášení přes Discord, první přihlášený = owner):
//  GET  /api/auth/login | /api/auth/callback | /api/auth/me,  POST /api/auth/logout
//  GET  /api/admin/overview         bugy, nahlášené nabídky, admini, čísla
//  POST /api/admin/bugs/:id         {action: fixed|open|delete}
//  POST /api/admin/:kind/:id        {action: hide|restore|delete}   kind = listing | wanted
//  POST /api/admin/admins           {action: add|remove, id, note?}  (jen owner)
//
//  Secrets (Cloudflare → Settings → Variables and Secrets):
//    DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET   Discord aplikace (OAuth2)
//    IP_SALT                                     volitelné, sůl pro hash IP
//    ADMIN_KEY                                   volitelné, hlavička x-admin-key pro skripty
// ============================================================
import { BY_ID, MAX_LINES, OVER_MAX } from '../public/bonuses.js';

const DAY = 86400000;
const TTL = 14 * DAY;            // nabídka/poptávka zmizí po 14 dnech bez obnovení
const SOLD_KEEP = 45 * DAY;      // prodané držíme jako cenovou historii
const SESSION_TTL = 30 * DAY;
const LIMITS = { listing: 15, wanted: 10, report: 30, bug: 6 };   // na IP a den
const IMG_MAX = 350 * 1024;
const BODY_MAX = 600 * 1024;     // celý požadavek (JSON nebo multipart s obrázkem)
const MAX_ADMINS = 10;

const SEC = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), {
  status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SEC, ...h },
});
const err = (msg, s = 400) => json({ error: msg }, s);
class HttpError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

let ready = null;
const schema = env => ready ||= env.DB.batch([
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY, kh TEXT NOT NULL, stats TEXT NOT NULL, sig TEXT NOT NULL,
    price INTEGER, sold_price INTEGER, nick TEXT NOT NULL, contact TEXT, note TEXT, rank INTEGER,
    img INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, bumped INTEGER NOT NULL, sold_at INTEGER,
    status TEXT NOT NULL DEFAULT 'active', reports INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, ih TEXT NOT NULL)`),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS listings_status ON listings(status, bumped)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS listings_sold ON listings(status, sold_at)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS listings_ih ON listings(ih, day)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS listings_sig ON listings(sig)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS imgs (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL)'),
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS wanted (
    id TEXT PRIMARY KEY, kh TEXT NOT NULL, want TEXT NOT NULL, need INTEGER NOT NULL, maxp INTEGER,
    nick TEXT NOT NULL, contact TEXT, note TEXT, created INTEGER NOT NULL, bumped INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', reports INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, ih TEXT NOT NULL)`),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS wanted_status ON wanted(status, bumped)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS wanted_ih ON wanted(ih, day)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS reports (target TEXT NOT NULL, ih TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (target, ih))'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS reports_ih ON reports(ih, day)'),
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS bugs (
    id TEXT PRIMARY KEY, text TEXT NOT NULL, contact TEXT, info TEXT, status TEXT NOT NULL DEFAULT 'open',
    created INTEGER NOT NULL, day TEXT NOT NULL, ih TEXT NOT NULL)`),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS bugs_ih ON bugs(ih, day)'),
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS admins (
    discord_id TEXT PRIMARY KEY, name TEXT, avatar TEXT, role TEXT NOT NULL DEFAULT 'admin', note TEXT,
    added_by TEXT, created INTEGER NOT NULL, last_login INTEGER)`),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS sessions (sh TEXT PRIMARY KEY, discord_id TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)'),
]).catch(e => { ready = null; throw e; });

// ---------- pomocné ----------
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const today = () => new Date().toISOString().slice(0, 10);
const ipHash = async (req, env, day) => (await sha((env.IP_SALT || 'pam') + ':' + day + ':' + (req.headers.get('cf-connecting-ip') || 'x'))).slice(0, 24);
const A = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// bez modulo zkreslení: 224 = 4 × 56, bajty ≥ 224 zahodíme
const rid = n => { let out = ''; while (out.length < n) for (const x of crypto.getRandomValues(new Uint8Array(n * 2))) if (x < 224 && out.length < n) out += A[x % 56]; return out; };
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max) : '';
const cleanMulti = (v, max) => typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, '').trim().slice(0, max) : '';
const NICK = /^[\p{L}\p{N}_\-.\[\]]{2,24}$/u;
function safeEqual(a, b) {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  if (x.length !== y.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(x, y);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0;
}
const keyAdmin = (req, env) => !!env.ADMIN_KEY && safeEqual(req.headers.get('x-admin-key') || '', env.ADMIN_KEY);

function cookies(req) {
  const out = {};
  for (const p of (req.headers.get('cookie') || '').split(';')) { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }
  return out;
}
const setCookie = (name, val, maxAge, path = '/') => `${name}=${val}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

// požadavek nesmí být moc velký (ochrana před zahlcením)
function sizeOk(req) {
  const n = Number(req.headers.get('content-length') || 0);
  if (n > BODY_MAX) throw new HttpError('The request is too large', 413);
}
async function body(req) { sizeOk(req); const b = await req.json().catch(() => null); if (!b || typeof b !== 'object') throw new HttpError('Invalid data'); return b; }
// u akcí s cookie: požadavek musí přijít z naší stránky (CSRF)
function sameOrigin(req, url) {
  const o = req.headers.get('origin');
  if (o !== url.origin) throw new HttpError('Forbidden', 403);
}

// obrázek musí být opravdu JPEG / PNG / WebP (kontrola hlavičky souboru, ne jen typu z prohlížeče)
function sniff(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

function price(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e15) throw new HttpError('Invalid price');
  return Math.round(n);
}
function statsOf(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_LINES) throw new HttpError('An artifact needs 1 to 7 bonuses');
  const seen = new Set(), out = [];
  for (const r of rows) {
    if (!Array.isArray(r)) throw new HttpError('Invalid row');
    const b = BY_ID[r[0]], v = Number(r[1]);
    if (!b) throw new HttpError('Unknown bonus');
    if (seen.has(b.id)) throw new HttpError(b.s + ' is there twice');
    if (!Number.isFinite(v) || v < b.min || v > b.max * OVER_MAX) throw new HttpError(b.s + ' is out of range');
    seen.add(b.id); out.push([b.id, Math.round(v * 100) / 100]);
  }
  return out;
}
function wantOf(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10) throw new HttpError('A wanted request needs 1 to 10 stats');
  const seen = new Set(), out = [];
  for (const r of rows) {
    const b = Array.isArray(r) && BY_ID[r[0]];
    if (!b) throw new HttpError('Unknown bonus');
    if (seen.has(b.id)) continue;
    const m = r[1] === null || r[1] === '' || r[1] === undefined ? 0 : Number(r[1]);
    if (!Number.isFinite(m) || m < 0 || m > b.max * OVER_MAX) throw new HttpError('Minimum for ' + b.s + ' is out of range');
    seen.add(b.id); out.push([b.id, Math.round(m * 100) / 100]);
  }
  return out;
}
const TABLES = { listings: 1, wanted: 1, reports: 1, bugs: 1 };
async function underLimit(env, table, ih, day, max) {
  if (!TABLES[table]) throw new Error('bad table');
  const r = await env.DB.prepare(`SELECT count(*) AS c FROM ${table} WHERE ih=? AND day=?`).bind(ih, day).first();
  return (r?.c || 0) < max;
}
async function insertWithId(sqlFn) {
  for (let n = 0; n < 5; n++) {
    const id = rid(8);
    try { await sqlFn(id); return id; }
    catch (e) { if (!/UNIQUE|PRIMARY/i.test(String(e))) throw e; }
  }
  throw new HttpError('Please try again', 503);
}

const pubListing = r => ({
  id: r.id, s: JSON.parse(r.stats), p: r.price, n: r.nick, d: r.contact || '', t: r.note || '',
  r: r.rank, i: r.img ? 1 : 0, c: r.created, b: r.bumped,
});
const pubWanted = r => ({
  id: r.id, w: JSON.parse(r.want), k: r.need, p: r.maxp, n: r.nick, d: r.contact || '', t: r.note || '', c: r.created, b: r.bumped,
});

// ---------- veřejné handlery ----------
async function market(env) {
  const now = Date.now();
  const [l, w, s] = await env.DB.batch([
    env.DB.prepare("SELECT id,stats,price,nick,contact,note,rank,img,created,bumped FROM listings WHERE status='active' AND bumped>? ORDER BY bumped DESC LIMIT 5000").bind(now - TTL),
    env.DB.prepare("SELECT id,want,need,maxp,nick,contact,note,created,bumped FROM wanted WHERE status='active' AND bumped>? ORDER BY bumped DESC LIMIT 2000").bind(now - TTL),
    env.DB.prepare("SELECT stats, coalesce(sold_price, price) AS p, sold_at FROM listings WHERE status='sold' AND sold_at>? ORDER BY sold_at DESC LIMIT 2000").bind(now - SOLD_KEEP),
  ]);
  return json({
    now,
    listings: l.results.map(pubListing),
    wanted: w.results.map(pubWanted),
    sold: s.results.map(r => ({ s: JSON.parse(r.stats), p: r.p, at: r.sold_at })),
  }, 200, { 'cache-control': 'public, max-age=10' });
}

async function createListing(req, env) {
  sizeOk(req);
  const ct = req.headers.get('content-type') || '';
  let data, img = null;
  if (ct.includes('multipart/form-data')) {
    const f = await req.formData().catch(() => null);
    if (!f) return err('Invalid data');
    try { data = JSON.parse(f.get('data') || ''); } catch { return err('Invalid data'); }
    const file = f.get('img');
    if (file && typeof file === 'object' && file.size) {
      if (file.size > IMG_MAX) return err('The image is too large');
      const buf = await file.arrayBuffer(), type = sniff(buf);
      if (!type) return err('The image must be JPG, PNG or WebP');
      img = { type, data: buf };
    }
  } else {
    data = await req.json().catch(() => null);
  }
  if (!data || typeof data !== 'object') return err('Invalid data');

  const stats = statsOf(data.stats), p = price(data.price);
  const nick = clean(data.nick, 24);
  if (!NICK.test(nick)) return err('Enter your in-game nick (2–24 characters, no spaces)');
  const contact = clean(data.contact, 40) || null, note = clean(data.note, 200) || null;
  const rank = data.rank === null || data.rank === undefined || data.rank === '' ? null : Number(data.rank);
  if (rank !== null && !(Number.isInteger(rank) && rank >= 0 && rank <= 30)) return err('Invalid rank');

  const day = today(), ih = await ipHash(req, env, day);
  if (!(await underLimit(env, 'listings', ih, day, LIMITS.listing))) return err('Daily listing limit reached, try again tomorrow.', 429);
  const sig = [...stats].sort((a, b) => a[0].localeCompare(b[0])).map(x => x.join(':')).join(',');
  const dup = await env.DB.prepare("SELECT id FROM listings WHERE sig=? AND lower(nick)=lower(?) AND status='active' AND bumped>?")
    .bind(sig, nick, Date.now() - TTL).first();
  if (dup) return err('You already have this artifact listed.', 409);

  const key = rid(24), kh = await sha(key), now = Date.now();
  const id = await insertWithId(id => {
    const ins = env.DB.prepare('INSERT INTO listings (id,kh,stats,sig,price,nick,contact,note,rank,img,created,bumped,day,ih) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, kh, JSON.stringify(stats), sig, p, nick, contact, note, rank, img ? 1 : 0, now, now, day, ih);
    // nabídka i obrázek najednou, ať nevznikne nabídka s chybějícím obrázkem
    return img ? env.DB.batch([ins, env.DB.prepare('INSERT INTO imgs (id,type,data) VALUES (?,?,?)').bind(id, img.type, img.data)]) : ins.run();
  });
  return json({ id, key });
}

async function listingAction(req, env, id) {
  const b = await body(req);
  const row = await env.DB.prepare('SELECT * FROM listings WHERE id=?').bind(id).first();
  if (!row || row.status === 'deleted') return err('Listing not found', 404);
  if (typeof b.key !== 'string' || !safeEqual(await sha(b.key), row.kh)) return err('This is not your listing', 403);
  const now = Date.now();
  switch (b.action) {
    case 'sold': {
      if (row.status !== 'active') return err('Only a live listing can be marked as sold');
      const sp = price(b.soldPrice ?? row.price);
      await env.DB.prepare("UPDATE listings SET status='sold', sold_price=?, sold_at=? WHERE id=?").bind(sp, now, id).run();
      break;
    }
    case 'bump': {
      // skrytou (nahlášenou) nabídku obnovit nejde, jinak by šlo obejít moderaci
      if (row.status !== 'active' && row.status !== 'sold') return err('This listing cannot be renewed');
      if (row.status === 'active' && now - row.bumped < DAY && row.bumped > now - TTL) return err('You can renew once every 24 hours');
      await env.DB.prepare("UPDATE listings SET status='active', bumped=?, sold_at=NULL, sold_price=NULL WHERE id=?").bind(now, id).run();
      break;
    }
    case 'edit': {
      const p = price(b.price), note = clean(b.note, 200) || null, contact = clean(b.contact, 40) || null;
      await env.DB.prepare('UPDATE listings SET price=?, note=?, contact=? WHERE id=?').bind(p, note, contact, id).run();
      break;
    }
    case 'delete':
      await env.DB.batch([
        env.DB.prepare("UPDATE listings SET status='deleted' WHERE id=?").bind(id),
        env.DB.prepare('DELETE FROM imgs WHERE id=?').bind(id),
      ]);
      break;
    default: return err('Unknown action');
  }
  return json({ ok: true });
}

async function createWanted(req, env) {
  const b = await body(req);
  const want = wantOf(b.want), maxp = price(b.maxPrice);
  const need = Math.max(1, Math.min(want.length, Number(b.need) || want.length));
  const nick = clean(b.nick, 24);
  if (!NICK.test(nick)) return err('Enter your in-game nick (2–24 characters, no spaces)');
  const contact = clean(b.contact, 40) || null, note = clean(b.note, 200) || null;
  const day = today(), ih = await ipHash(req, env, day);
  if (!(await underLimit(env, 'wanted', ih, day, LIMITS.wanted))) return err('Daily request limit reached, try again tomorrow.', 429);
  const key = rid(24), kh = await sha(key), now = Date.now();
  const id = await insertWithId(id => env.DB.prepare(
    'INSERT INTO wanted (id,kh,want,need,maxp,nick,contact,note,created,bumped,day,ih) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, kh, JSON.stringify(want), need, maxp, nick, contact, note, now, now, day, ih).run());
  return json({ id, key });
}

async function wantedAction(req, env, id) {
  const b = await body(req);
  const row = await env.DB.prepare('SELECT * FROM wanted WHERE id=?').bind(id).first();
  if (!row || row.status === 'deleted') return err('Request not found', 404);
  if (typeof b.key !== 'string' || !safeEqual(await sha(b.key), row.kh)) return err('This is not your request', 403);
  const now = Date.now();
  if (b.action === 'bump') {
    if (row.status !== 'active') return err('This request cannot be renewed');
    if (now - row.bumped < DAY && row.bumped > now - TTL) return err('You can renew once every 24 hours');
    await env.DB.prepare('UPDATE wanted SET bumped=? WHERE id=?').bind(now, id).run();
  } else if (b.action === 'delete') {
    await env.DB.prepare("UPDATE wanted SET status='deleted' WHERE id=?").bind(id).run();
  } else return err('Unknown action');
  return json({ ok: true });
}

// moje věci: všechny dotazy v jedné dávce místo jednoho po druhém
async function mine(req, env) {
  const b = await body(req);
  const items = (Array.isArray(b.items) ? b.items : []).filter(it => it && typeof it.id === 'string' && /^[A-Za-z0-9]{6,12}$/.test(it.id) && typeof it.key === 'string' && it.key.length <= 64).slice(0, 100);
  const out = { listings: [], wanted: [] };
  if (!items.length) return json(out);
  const res = await env.DB.batch(items.map(it => env.DB.prepare(`SELECT * FROM ${it.kind === 'wanted' ? 'wanted' : 'listings'} WHERE id=?`).bind(it.id)));
  const now = Date.now();
  for (let i = 0; i < items.length; i++) {
    const it = items[i], row = res[i].results[0], table = it.kind === 'wanted' ? 'wanted' : 'listings';
    if (!row || row.status === 'deleted' || !safeEqual(row.kh, await sha(it.key))) continue;
    const expired = row.status === 'active' && row.bumped <= now - TTL;
    const base = table === 'wanted' ? pubWanted(row) : { ...pubListing(row), sp: row.sold_price, sa: row.sold_at };
    out[table].push({ ...base, st: expired ? 'expired' : row.status, rep: row.reports });
  }
  return json(out);
}

async function report(req, env, kind, id) {
  const table = kind === 'wanted' ? 'wanted' : 'listings';
  const day = today(), ih = await ipHash(req, env, 'report');      // stálý hash, ať jeden člověk nahlásí jen jednou
  if (!(await underLimit(env, 'reports', ih, day, LIMITS.report))) return err('Daily report limit reached', 429);
  const row = await env.DB.prepare(`SELECT ih, day, status FROM ${table} WHERE id=?`).bind(id).first();
  if (!row || row.status !== 'active') return err('Not found', 404);
  if (row.ih === await ipHash(req, env, row.day)) return err('You cannot report your own listing');
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO reports (target, ih, day) VALUES (?,?,?)').bind(kind + ':' + id, ih, day).run();
  if (ins.meta?.changes) {
    await env.DB.prepare(`UPDATE ${table} SET reports=reports+1, status=CASE WHEN reports+1>=3 AND status='active' THEN 'hidden' ELSE status END WHERE id=?`).bind(id).run();
  }
  return json({ ok: true });
}

async function createBug(req, env) {
  const b = await body(req);
  const text = cleanMulti(b.text, 2000);
  if (text.length < 5) return err('Describe the problem in a few words');
  const contact = clean(b.contact, 60) || null;
  const info = {};
  if (b.info && typeof b.info === 'object')
    for (const k of ['view', 'lang', 'theme', 'screen', 'ua', 'url']) if (b.info[k] != null) info[k] = clean(String(b.info[k]), 300);
  const day = today(), ih = await ipHash(req, env, day);
  if (!(await underLimit(env, 'bugs', ih, day, LIMITS.bug))) return err('Daily limit reached, thank you! Try again tomorrow.', 429);
  await insertWithId(id => env.DB.prepare('INSERT INTO bugs (id,text,contact,info,created,day,ih) VALUES (?,?,?,?,?,?,?)')
    .bind(id, text, contact, JSON.stringify(info), Date.now(), day, ih).run());
  return json({ ok: true });
}

async function image(env, id) {
  const r = await env.DB.prepare('SELECT type, data FROM imgs WHERE id=?').bind(id).first();
  if (!r) return new Response('Not found', { status: 404, headers: SEC });
  const body = r.data instanceof ArrayBuffer ? r.data : new Uint8Array(r.data);
  const type = /^image\/(jpeg|png|webp)$/.test(r.type) ? r.type : 'application/octet-stream';
  return new Response(body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400', 'content-security-policy': "default-src 'none'; sandbox", ...SEC } });
}

// ---------- Discord přihlášení ----------
const DISCORD = env => ({ api: env.DISCORD_API || 'https://discord.com/api', auth: env.DISCORD_AUTHORIZE || 'https://discord.com/oauth2/authorize' });
const configured = env => !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET);

async function authLogin(req, env, url) {
  if (!configured(env)) return Response.redirect(url.origin + '/#/admin?e=config', 302);
  const state = rid(32);
  const q = new URLSearchParams({ response_type: 'code', client_id: env.DISCORD_CLIENT_ID, scope: 'identify', state, redirect_uri: url.origin + '/api/auth/callback', prompt: 'none' });
  return new Response(null, { status: 302, headers: { location: DISCORD(env).auth + '?' + q, 'set-cookie': setCookie('pam_st', state, 600, '/api/auth'), 'cache-control': 'no-store', ...SEC } });
}

async function authCallback(req, env, url) {
  const back = (hash, extra = {}) => new Response(null, { status: 302, headers: { location: url.origin + '/#/admin' + hash, 'cache-control': 'no-store', ...SEC, ...extra } });
  const clearState = setCookie('pam_st', '', 0, '/api/auth');
  const state = url.searchParams.get('state') || '', code = url.searchParams.get('code') || '';
  const st = cookies(req).pam_st || '';
  if (!configured(env)) return back('?e=config');
  if (!code || !state || !st || !safeEqual(state, st)) return back('?e=state', { 'set-cookie': clearState });
  const d = DISCORD(env);
  const tok = await fetch(d.api + '/oauth2/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: url.origin + '/api/auth/callback' }),
  }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!tok?.access_token) return back('?e=discord', { 'set-cookie': clearState });
  const user = await fetch(d.api + '/users/@me', { headers: { authorization: 'Bearer ' + tok.access_token } }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!user?.id || !/^\d{5,25}$/.test(user.id)) return back('?e=discord', { 'set-cookie': clearState });
  const name = clean(user.global_name || user.username || '', 64), avatar = /^[a-z0-9_]{1,64}$/i.test(user.avatar || '') ? user.avatar : null;
  const now = Date.now();
  // první přihlášený se stane ownerem (jen dokud v tabulce není nikdo)
  await env.DB.prepare("INSERT INTO admins (discord_id,name,avatar,role,created,last_login) SELECT ?,?,?,'owner',?,? WHERE NOT EXISTS (SELECT 1 FROM admins)")
    .bind(user.id, name, avatar, now, now).run();
  const adm = await env.DB.prepare('SELECT role FROM admins WHERE discord_id=?').bind(user.id).first();
  if (!adm) return back('?e=denied', { 'set-cookie': clearState });
  const sid = rid(40);
  await env.DB.batch([
    env.DB.prepare('UPDATE admins SET name=?, avatar=?, last_login=? WHERE discord_id=?').bind(name, avatar, now, user.id),
    env.DB.prepare('INSERT INTO sessions (sh,discord_id,created,expires) VALUES (?,?,?,?)').bind(await sha(sid), user.id, now, now + SESSION_TTL),
    env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now),
  ]);
  const h = new Headers({ location: url.origin + '/#/admin', 'cache-control': 'no-store', ...SEC });
  h.append('set-cookie', clearState); h.append('set-cookie', setCookie('pam_s', sid, SESSION_TTL / 1000));
  return new Response(null, { status: 302, headers: h });
}

async function sessionAdmin(req, env) {
  const sid = cookies(req).pam_s;
  if (!sid || !/^[A-Za-z0-9]{20,64}$/.test(sid)) return null;
  return await env.DB.prepare('SELECT a.discord_id AS id, a.name, a.avatar, a.role FROM sessions s JOIN admins a ON a.discord_id=s.discord_id WHERE s.sh=? AND s.expires>?')
    .bind(await sha(sid), Date.now()).first();
}
async function requireAdmin(req, env, url) {
  if (keyAdmin(req, env)) return { id: 'key', name: 'ADMIN_KEY', role: 'owner' };
  const a = await sessionAdmin(req, env);
  if (!a) throw new HttpError('Log in first', 401);
  if (req.method !== 'GET') sameOrigin(req, url);
  return a;
}

// ---------- admin ----------
async function overview(env, me) {
  const now = Date.now();
  const [bugs, rl, rw, adm, cnt] = await env.DB.batch([
    env.DB.prepare('SELECT id,text,contact,info,status,created FROM bugs ORDER BY (status=\'open\') DESC, created DESC LIMIT 300'),
    env.DB.prepare("SELECT * FROM listings WHERE reports>0 AND status IN ('active','hidden') ORDER BY (status='hidden') DESC, reports DESC LIMIT 200"),
    env.DB.prepare("SELECT * FROM wanted WHERE reports>0 AND status IN ('active','hidden') ORDER BY (status='hidden') DESC, reports DESC LIMIT 200"),
    env.DB.prepare('SELECT discord_id AS id, name, avatar, role, note, created, last_login FROM admins ORDER BY role=\'owner\' DESC, created'),
    env.DB.prepare("SELECT (SELECT count(*) FROM listings WHERE status='active' AND bumped>?1) AS live, (SELECT count(*) FROM wanted WHERE status='active' AND bumped>?1) AS wanted, (SELECT count(*) FROM listings WHERE status='sold') AS sold, (SELECT count(*) FROM bugs WHERE status='open') AS bugs, (SELECT count(*) FROM listings WHERE created>?2) AS today").bind(now - TTL, now - DAY),
  ]);
  return json({
    me, counts: cnt.results[0],
    bugs: bugs.results.map(b => ({ ...b, info: JSON.parse(b.info || '{}') })),
    listings: rl.results.map(r => ({ ...pubListing(r), st: r.status, rep: r.reports })),
    wanted: rw.results.map(r => ({ ...pubWanted(r), st: r.status, rep: r.reports })),
    admins: me.role === 'owner' ? adm.results : adm.results.map(({ id, name, avatar, role }) => ({ id, name, avatar, role })),
  });
}
async function adminBug(req, env, id) {
  const b = await body(req);
  if (b.action === 'delete') await env.DB.prepare('DELETE FROM bugs WHERE id=?').bind(id).run();
  else if (b.action === 'fixed' || b.action === 'open') await env.DB.prepare('UPDATE bugs SET status=? WHERE id=?').bind(b.action, id).run();
  else return err('Unknown action');
  return json({ ok: true });
}
async function adminItem(req, env, kind, id) {
  const b = await body(req), table = kind === 'wanted' ? 'wanted' : 'listings';
  const row = await env.DB.prepare(`SELECT status FROM ${table} WHERE id=?`).bind(id).first();
  if (!row || row.status === 'deleted') return err('Not found', 404);
  if (b.action === 'hide') await env.DB.prepare(`UPDATE ${table} SET status='hidden' WHERE id=?`).bind(id).run();
  else if (b.action === 'restore') await env.DB.batch([
    env.DB.prepare(`UPDATE ${table} SET status='active', reports=0 WHERE id=?`).bind(id),
    env.DB.prepare('DELETE FROM reports WHERE target=?').bind(kind + ':' + id),
  ]);
  else if (b.action === 'delete') await env.DB.batch([
    env.DB.prepare(`UPDATE ${table} SET status='deleted' WHERE id=?`).bind(id),
    ...(table === 'listings' ? [env.DB.prepare('DELETE FROM imgs WHERE id=?').bind(id)] : []),
  ]);
  else return err('Unknown action');
  return json({ ok: true });
}
async function adminAdmins(req, env, me) {
  if (me.role !== 'owner') return err('Only the owner can manage admins', 403);
  const b = await body(req), id = String(b.id || '').trim();
  if (!/^\d{15,25}$/.test(id)) return err('Enter a Discord user ID (a long number)');
  if (b.action === 'add') {
    const c = await env.DB.prepare('SELECT count(*) AS c FROM admins').first();
    if ((c?.c || 0) >= MAX_ADMINS) return err('Too many admins');
    await env.DB.prepare("INSERT OR IGNORE INTO admins (discord_id,role,note,added_by,created) VALUES (?,'admin',?,?,?)").bind(id, clean(b.note, 60) || null, me.id, Date.now()).run();
  } else if (b.action === 'remove') {
    if (id === me.id) return err('You cannot remove yourself');
    await env.DB.batch([
      env.DB.prepare("DELETE FROM admins WHERE discord_id=? AND role!='owner'").bind(id),
      env.DB.prepare('DELETE FROM sessions WHERE discord_id=? AND discord_id NOT IN (SELECT discord_id FROM admins)').bind(id),
    ]);
  } else return err('Unknown action');
  return json({ ok: true });
}

// ---------- router ----------
const ID = '([A-Za-z0-9]{6,12})';
export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname, m = req.method;
    if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      await schema(env);
      let x;
      if (p === '/api/market' && m === 'GET') return await market(env);
      if (p === '/api/listings' && m === 'POST') return await createListing(req, env);
      if ((x = p.match(new RegExp('^/api/listings/' + ID + '$'))) && m === 'POST') return await listingAction(req, env, x[1]);
      if (p === '/api/wanted' && m === 'POST') return await createWanted(req, env);
      if ((x = p.match(new RegExp('^/api/wanted/' + ID + '$'))) && m === 'POST') return await wantedAction(req, env, x[1]);
      if (p === '/api/mine' && m === 'POST') return await mine(req, env);
      if ((x = p.match(new RegExp('^/api/report/(listing|wanted)/' + ID + '$'))) && m === 'POST') return await report(req, env, x[1], x[2]);
      if (p === '/api/bugs' && m === 'POST') return await createBug(req, env);
      if ((x = p.match(new RegExp('^/api/img/' + ID + '$'))) && m === 'GET') return await image(env, x[1]);

      if (p === '/api/auth/login' && m === 'GET') return await authLogin(req, env, url);
      if (p === '/api/auth/callback' && m === 'GET') return await authCallback(req, env, url);
      if (p === '/api/auth/me' && m === 'GET') return json({ configured: configured(env), admin: await sessionAdmin(req, env) });
      if (p === '/api/auth/logout' && m === 'POST') {
        sameOrigin(req, url);
        const sid = cookies(req).pam_s;
        if (sid) await env.DB.prepare('DELETE FROM sessions WHERE sh=?').bind(await sha(sid)).run();
        return json({ ok: true }, 200, { 'set-cookie': setCookie('pam_s', '', 0) });
      }
      if (p.startsWith('/api/admin/')) {
        const me = await requireAdmin(req, env, url);
        if (p === '/api/admin/overview' && m === 'GET') return await overview(env, me);
        if ((x = p.match(new RegExp('^/api/admin/bugs/' + ID + '$'))) && m === 'POST') return await adminBug(req, env, x[1]);
        if ((x = p.match(new RegExp('^/api/admin/(listing|wanted)/' + ID + '$'))) && m === 'POST') return await adminItem(req, env, x[1], x[2]);
        if (p === '/api/admin/admins' && m === 'POST') return await adminAdmins(req, env, me);
        if (p === '/api/admin/reported' && m === 'GET') return await overview(env, me);
      }
      return err('Not found', 404);
    } catch (e) {
      if (e instanceof HttpError) return err(e.message, e.status);
      console.error('API error', p, e && e.stack || e);
      return err('Something went wrong, please try again', 500);      // vnitřní chyby nevracíme ven
    }
  },
};
