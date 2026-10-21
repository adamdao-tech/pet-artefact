// ============================================================
//  Pet Artefakt Market – API
//
//  GET  /api/market                 aktivní nabídky + poptávky + nedávno prodané
//  POST /api/listings               nová nabídka (multipart: data=JSON, img=screenshot)
//  POST /api/listings/:id           akce s editačním klíčem: sold | bump | edit | delete
//  POST /api/wanted                 nová poptávka (JSON)
//  POST /api/wanted/:id             akce s klíčem: bump | delete
//  POST /api/mine                   moje nabídky/poptávky podle klíčů (i prodané/vypršelé)
//  POST /api/report/:kind/:id       nahlásit (3 různá nahlášení = skryto)
//  GET  /api/img/:id                screenshot nabídky
//  Vše ostatní = statické soubory z /public.
//
//  Žádné účty: kdo vystaví nabídku, dostane tajný klíč (uložený v jeho prohlížeči).
//  Admin: hlavička x-admin-key = secret ADMIN_KEY (wrangler secret put ADMIN_KEY)
//  smí mazat cokoliv a vidí GET /api/admin/reported.
// ============================================================
import { BY_ID, MAX_LINES, OVER_MAX } from '../public/bonuses.js';

const DAY = 86400000;
const TTL = 14 * DAY;            // nabídka/poptávka zmizí po 14 dnech bez obnovení
const SOLD_KEEP = 45 * DAY;      // prodané držíme jako cenovou historii
const LIMITS = { listing: 15, wanted: 10, report: 30 };   // na IP a den
const IMG_MAX = 350 * 1024;

const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), {
  status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h },
});
const err = (msg, s = 400) => json({ error: msg }, s);

let ready = null;
const schema = env => ready ||= env.DB.batch([
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY, kh TEXT NOT NULL, stats TEXT NOT NULL, sig TEXT NOT NULL,
    price INTEGER, sold_price INTEGER, nick TEXT NOT NULL, contact TEXT, note TEXT, rank INTEGER,
    img INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, bumped INTEGER NOT NULL, sold_at INTEGER,
    status TEXT NOT NULL DEFAULT 'active', reports INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, ih TEXT NOT NULL)`),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS listings_status ON listings(status, bumped)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS listings_ih ON listings(ih, day)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS imgs (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL)'),
  env.DB.prepare(`CREATE TABLE IF NOT EXISTS wanted (
    id TEXT PRIMARY KEY, kh TEXT NOT NULL, want TEXT NOT NULL, need INTEGER NOT NULL, maxp INTEGER,
    nick TEXT NOT NULL, contact TEXT, note TEXT, created INTEGER NOT NULL, bumped INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', reports INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, ih TEXT NOT NULL)`),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS wanted_status ON wanted(status, bumped)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS wanted_ih ON wanted(ih, day)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS reports (target TEXT NOT NULL, ih TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (target, ih))'),
]).catch(e => { ready = null; throw e; });

// ---------- pomocné ----------
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const today = () => new Date().toISOString().slice(0, 10);
const ipHash = async (req, day) => (await sha('pam:' + day + ':' + (req.headers.get('cf-connecting-ip') || 'x'))).slice(0, 24);
const A = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => A[x % A.length]).join('');
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max) : '';
const NICK = /^[\p{L}\p{N}_\-.\[\]]{2,24}$/u;
const isAdmin = (req, env) => !!env.ADMIN_KEY && req.headers.get('x-admin-key') === env.ADMIN_KEY;

function price(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e15) throw new Error('Invalid price');
  return Math.round(n);
}
function statsOf(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_LINES) throw new Error('An artifact needs 1 to 7 bonuses');
  const seen = new Set(), out = [];
  for (const r of rows) {
    if (!Array.isArray(r)) throw new Error('Invalid row');
    const b = BY_ID[r[0]], v = Number(r[1]);
    if (!b) throw new Error('Unknown bonus');
    if (seen.has(b.id)) throw new Error(b.s + ' is there twice');
    if (!Number.isFinite(v) || v <= 0 || v > b.max * OVER_MAX) throw new Error(b.s + ' is out of range');
    seen.add(b.id); out.push([b.id, Math.round(v * 100) / 100]);
  }
  return out;
}
function wantOf(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10) throw new Error('A wanted request needs 1 to 10 stats');
  const seen = new Set(), out = [];
  for (const r of rows) {
    const b = Array.isArray(r) && BY_ID[r[0]];
    if (!b) throw new Error('Unknown bonus');
    if (seen.has(b.id)) continue;
    const m = r[1] === null || r[1] === '' || r[1] === undefined ? 0 : Number(r[1]);
    if (!Number.isFinite(m) || m < 0 || m > b.max * OVER_MAX) throw new Error('Minimum for ' + b.s + ' is out of range');
    seen.add(b.id); out.push([b.id, Math.round(m * 100) / 100]);
  }
  return out;
}
async function underLimit(env, table, ih, day, max) {
  const r = await env.DB.prepare(`SELECT count(*) AS c FROM ${table} WHERE ih=? AND day=?`).bind(ih, day).first();
  return (r?.c || 0) < max;
}
async function insertWithId(env, sqlFn) {
  for (let n = 0; n < 5; n++) {
    const id = rid(8);
    try { await sqlFn(id); return id; }
    catch (e) { if (!/UNIQUE|PRIMARY/i.test(String(e))) throw e; }
  }
  throw new Error('Please try again');
}

const pubListing = r => ({
  id: r.id, s: JSON.parse(r.stats), p: r.price, n: r.nick, d: r.contact || '', t: r.note || '',
  r: r.rank, i: r.img ? 1 : 0, c: r.created, b: r.bumped,
});
const pubWanted = r => ({
  id: r.id, w: JSON.parse(r.want), k: r.need, p: r.maxp, n: r.nick, d: r.contact || '', t: r.note || '', c: r.created, b: r.bumped,
});

// ---------- handlery ----------
async function market(env) {
  const now = Date.now();
  const [l, w, s] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM listings WHERE status='active' AND bumped>? ORDER BY bumped DESC LIMIT 5000").bind(now - TTL),
    env.DB.prepare("SELECT * FROM wanted WHERE status='active' AND bumped>? ORDER BY bumped DESC LIMIT 2000").bind(now - TTL),
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
  const ct = req.headers.get('content-type') || '';
  let data, img = null;
  if (ct.includes('multipart/form-data')) {
    const f = await req.formData();
    try { data = JSON.parse(f.get('data') || ''); } catch { return err('Invalid data'); }
    const file = f.get('img');
    if (file && typeof file === 'object' && file.size) {
      if (!/^image\/(jpeg|webp|png)$/.test(file.type)) return err('The image must be JPG, PNG or WebP');
      if (file.size > IMG_MAX) return err('The image is too large');
      img = { type: file.type, data: await file.arrayBuffer() };
    }
  } else {
    data = await req.json().catch(() => null);
  }
  if (!data || typeof data !== 'object') return err('Invalid data');

  let stats, p;
  try { stats = statsOf(data.stats); p = price(data.price); } catch (e) { return err(e.message); }
  const nick = clean(data.nick, 24);
  if (!NICK.test(nick)) return err('Enter your in-game nick (2–24 characters, no spaces)');
  const contact = clean(data.contact, 40) || null, note = clean(data.note, 200) || null;
  const rank = data.rank === null || data.rank === undefined || data.rank === '' ? null : Number(data.rank);
  if (rank !== null && !(Number.isInteger(rank) && rank >= 0 && rank <= 30)) return err('Invalid rank');

  const day = today(), ih = await ipHash(req, day);
  if (!(await underLimit(env, 'listings', ih, day, LIMITS.listing))) return err('Daily listing limit reached, try again tomorrow.', 429);
  const sig = [...stats].sort((a, b) => a[0].localeCompare(b[0])).map(x => x.join(':')).join(',');
  const dup = await env.DB.prepare("SELECT id FROM listings WHERE sig=? AND lower(nick)=lower(?) AND status='active' AND bumped>?")
    .bind(sig, nick, Date.now() - TTL).first();
  if (dup) return err('You already have this artifact listed.', 409);

  const key = rid(24), kh = await sha(key), now = Date.now();
  const id = await insertWithId(env, id => env.DB.prepare(
    'INSERT INTO listings (id,kh,stats,sig,price,nick,contact,note,rank,img,created,bumped,day,ih) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, kh, JSON.stringify(stats), sig, p, nick, contact, note, rank, img ? 1 : 0, now, now, day, ih).run());
  if (img) await env.DB.prepare('INSERT INTO imgs (id,type,data) VALUES (?,?,?)').bind(id, img.type, img.data).run();
  return json({ id, key });
}

async function listingAction(req, env, id) {
  const b = await req.json().catch(() => null);
  if (!b) return err('Invalid data');
  const row = await env.DB.prepare('SELECT * FROM listings WHERE id=?').bind(id).first();
  if (!row || row.status === 'deleted') return err('Listing not found', 404);
  const admin = isAdmin(req, env);
  if (!admin && (typeof b.key !== 'string' || (await sha(b.key)) !== row.kh)) return err('This is not your listing', 403);
  const now = Date.now();
  try {
    switch (b.action) {
      case 'sold': {
        const sp = price(b.soldPrice ?? row.price);
        await env.DB.prepare("UPDATE listings SET status='sold', sold_price=?, sold_at=? WHERE id=?").bind(sp, now, id).run();
        break;
      }
      case 'bump': {
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
  } catch (e) { return err(e.message); }
  return json({ ok: true });
}

async function createWanted(req, env) {
  const b = await req.json().catch(() => null);
  if (!b) return err('Invalid data');
  let want, maxp;
  try { want = wantOf(b.want); maxp = price(b.maxPrice); } catch (e) { return err(e.message); }
  const need = Math.max(1, Math.min(want.length, Number(b.need) || want.length));
  const nick = clean(b.nick, 24);
  if (!NICK.test(nick)) return err('Enter your in-game nick (2–24 characters, no spaces)');
  const contact = clean(b.contact, 40) || null, note = clean(b.note, 200) || null;
  const day = today(), ih = await ipHash(req, day);
  if (!(await underLimit(env, 'wanted', ih, day, LIMITS.wanted))) return err('Daily request limit reached, try again tomorrow.', 429);
  const key = rid(24), kh = await sha(key), now = Date.now();
  const id = await insertWithId(env, id => env.DB.prepare(
    'INSERT INTO wanted (id,kh,want,need,maxp,nick,contact,note,created,bumped,day,ih) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, kh, JSON.stringify(want), need, maxp, nick, contact, note, now, now, day, ih).run());
  return json({ id, key });
}

async function wantedAction(req, env, id) {
  const b = await req.json().catch(() => null);
  if (!b) return err('Invalid data');
  const row = await env.DB.prepare('SELECT * FROM wanted WHERE id=?').bind(id).first();
  if (!row || row.status === 'deleted') return err('Request not found', 404);
  if (!isAdmin(req, env) && (typeof b.key !== 'string' || (await sha(b.key)) !== row.kh)) return err('This is not your request', 403);
  const now = Date.now();
  if (b.action === 'bump') {
    if (now - row.bumped < DAY && row.bumped > now - TTL) return err('You can renew once every 24 hours');
    await env.DB.prepare("UPDATE wanted SET status='active', bumped=? WHERE id=?").bind(now, id).run();
  } else if (b.action === 'delete') {
    await env.DB.prepare("UPDATE wanted SET status='deleted' WHERE id=?").bind(id).run();
  } else return err('Unknown action');
  return json({ ok: true });
}

async function mine(req, env) {
  const b = await req.json().catch(() => null);
  const items = Array.isArray(b?.items) ? b.items.slice(0, 100) : [];
  const out = { listings: [], wanted: [] };
  for (const it of items) {
    if (!it || typeof it.id !== 'string' || typeof it.key !== 'string') continue;
    const table = it.kind === 'wanted' ? 'wanted' : 'listings';
    const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(it.id).first();
    if (!row || row.kh !== (await sha(it.key))) continue;
    const expired = row.status === 'active' && row.bumped <= Date.now() - TTL;
    const base = table === 'wanted' ? pubWanted(row) : { ...pubListing(row), sp: row.sold_price, sa: row.sold_at };
    out[table].push({ ...base, st: expired ? 'expired' : row.status, rep: row.reports });
  }
  return json(out);
}

async function report(req, env, kind, id) {
  const table = kind === 'wanted' ? 'wanted' : 'listings';
  const day = today(), ih = await ipHash(req, 'report');      // stálý hash, ať jeden člověk nahlásí jen jednou
  const dayIh = await ipHash(req, day);
  const used = await env.DB.prepare('SELECT count(*) AS c FROM reports WHERE ih=? AND day=?').bind(ih, day).first();
  if ((used?.c || 0) >= LIMITS.report) return err('Daily report limit reached', 429);
  const row = await env.DB.prepare(`SELECT ih FROM ${table} WHERE id=?`).bind(id).first();
  if (!row) return err('Not found', 404);
  if (row.ih === dayIh) return err('You cannot report your own listing');
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO reports (target, ih, day) VALUES (?,?,?)').bind(kind + ':' + id, ih, day).run();
  if (ins.meta?.changes) {
    await env.DB.prepare(`UPDATE ${table} SET reports=reports+1, status=CASE WHEN reports+1>=3 AND status='active' THEN 'hidden' ELSE status END WHERE id=?`).bind(id).run();
  }
  return json({ ok: true });
}

async function image(env, id) {
  const r = await env.DB.prepare('SELECT type, data FROM imgs WHERE id=?').bind(id).first();
  if (!r) return new Response('Not found', { status: 404 });
  const body = r.data instanceof ArrayBuffer ? r.data : new Uint8Array(r.data);
  return new Response(body, { headers: { 'content-type': r.type, 'cache-control': 'public, max-age=31536000, immutable' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname, m = req.method;
    if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      await schema(env);
      let x;
      if (p === '/api/market' && m === 'GET') return market(env);
      if (p === '/api/listings' && m === 'POST') return createListing(req, env);
      if ((x = p.match(/^\/api\/listings\/([A-Za-z0-9]{6,12})$/)) && m === 'POST') return listingAction(req, env, x[1]);
      if (p === '/api/wanted' && m === 'POST') return createWanted(req, env);
      if ((x = p.match(/^\/api\/wanted\/([A-Za-z0-9]{6,12})$/)) && m === 'POST') return wantedAction(req, env, x[1]);
      if (p === '/api/mine' && m === 'POST') return mine(req, env);
      if ((x = p.match(/^\/api\/report\/(listing|wanted)\/([A-Za-z0-9]{6,12})$/)) && m === 'POST') return report(req, env, x[1], x[2]);
      if ((x = p.match(/^\/api\/img\/([A-Za-z0-9]{6,12})$/)) && m === 'GET') return image(env, x[1]);
      if (p === '/api/admin/reported' && m === 'GET') {
        if (!isAdmin(req, env)) return err('Forbidden', 403);
        const [l, w] = await env.DB.batch([
          env.DB.prepare('SELECT * FROM listings WHERE reports>0 AND status!=\'deleted\' ORDER BY reports DESC LIMIT 200'),
          env.DB.prepare('SELECT * FROM wanted WHERE reports>0 AND status!=\'deleted\' ORDER BY reports DESC LIMIT 200'),
        ]);
        return json({ listings: l.results.map(r => ({ ...pubListing(r), st: r.status, rep: r.reports })), wanted: w.results.map(r => ({ ...pubWanted(r), st: r.status, rep: r.reports })) });
      }
      return err('not found', 404);
    } catch (e) {
      return err(String(e && e.message || e), 500);
    }
  },
};
