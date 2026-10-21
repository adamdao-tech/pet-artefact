// ============================================================
//  Pet Artifact Market – UI (English only)
//  Views: #/market (buy), #/sell, #/wanted, #/mine
// ============================================================
import { BONUSES, GROUPS, BY_ID, MAX_LINES } from './bonuses.js';
import { readScreenshot, loadImg, makeThumb } from './ocr.js';
import { setFx } from './fx.js';

// ---------- basics ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('pam:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pam:' + k, JSON.stringify(v)); } catch {} },
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

const fmtNum = v => (Math.round(v * 100) / 100).toLocaleString('en-US');
const unitTxt = b => b.unit === '%' ? '%' : '';
const fmtV = (b, v) => '+' + fmtNum(v) + unitTxt(b);
const pct = (b, v) => clamp((v - b.min) / ((b.max - b.min) || 1), 0, 1);
const rangeTxt = b => b ? `${fmtNum(b.min)}–${fmtNum(b.max)}${unitTxt(b)}` : '';
const parseYang = s => {
  const t = String(s ?? '').trim().toLowerCase().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)(k*|m|b)$/); if (!m) return NaN;
  const mul = m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : Math.pow(1000, m[2].length);
  return Math.round(parseFloat(m[1]) * mul);
};
const fmtYang = v => {
  if (v == null) return '';
  const a = Math.abs(v);
  if (a >= 1e9) return fmtNum(v / 1e9) + ' kkk';
  if (a >= 1e6) return fmtNum(v / 1e6) + ' kk';
  if (a >= 1e3) return fmtNum(v / 1e3) + ' k';
  return fmtNum(v);
};
const yangInput = v => v == null ? '' : v >= 1e9 && v % 1e7 === 0 ? (v / 1e9) + 'kkk' : v >= 1e6 && v % 1e4 === 0 ? (v / 1e6) + 'kk' : v >= 1e3 && v % 10 === 0 ? (v / 1e3) + 'k' : String(v);
const ago = t => {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400); return `${d} ${d === 1 ? 'day' : 'days'} ago`;
};
// cena s ikonkou yangu, Discord kontakt s ikonkou
const yangHTML = v => `<img class="coin" src="icons/yang.png" alt="">${fmtYang(v)}<span class="cur">yang</span>`;
const discordHTML = d => d ? `<button class="dc" data-dc="${esc(d)}" title="Discord: ${esc(d)} (click to copy)"><img src="icons/discord.png" alt="Discord"><span>${esc(d)}</span></button>` : '';
// jak dlouho je nabídka venku: „posted 2 min ago“ / „renewed 1 h ago“, živě se přepočítává
const TTL_MS = 14 * 86400e3;
const fmtDate = t => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const left = t => { const d = (t + TTL_MS - Date.now()) / 86400e3; return d <= 0 ? 'expired' : d < 1 ? `expires in ${Math.max(1, Math.round(d * 24))} h` : `expires in ${Math.round(d)} ${Math.round(d) === 1 ? 'day' : 'days'}`; };
const timeLabel = (c, b) => (b && c && b - c > 60e3 ? 'renewed ' : 'posted ') + ago(b || c);
const timeHTML = (c, b, cls = 'age') => `<span class="${cls}" data-tc="${c}" data-tb="${b || c}" title="Posted ${fmtDate(c)}${b && b - c > 60e3 ? `, renewed ${fmtDate(b)}` : ''} · ${left(b || c)}">${timeLabel(c, b)}</span>`;
setInterval(() => $$('[data-tc]').forEach(e => { e.textContent = timeLabel(+e.dataset.tc, +e.dataset.tb) + (e.dataset.exp ? ' · ' + left(+e.dataset.tb) : ''); }), 30000);
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const plural = (n, w, pl) => `${n} ${n === 1 ? w : (pl || w + 's')}`;
const bName = b => b.s;
const W8 = { 3: 1, 2: 0.55, 1: 0 };
const NICK_RE = /^[\p{L}\p{N}_\-.\[\]]{2,24}$/u;

function toast(msg) {
  $('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg || 'Copied'); }
  catch { prompt('Copy this:', text); }
}
function lightbox(src) {
  const d = document.createElement('div'); d.className = 'lb'; d.innerHTML = `<img src="${esc(src)}" alt="">`;
  d.onclick = () => d.remove(); document.body.appendChild(d);
  const k = e => { if (e.key === 'Escape') { d.remove(); removeEventListener('keydown', k); } }; addEventListener('keydown', k);
}

// ---------- data ----------
let D = { now: Date.now(), listings: [], wanted: [], sold: [] };
let loaded = false, loadErr = '';
async function loadMarket(fresh) {
  try {
    const r = await fetch('/api/market' + (fresh ? '?t=' + Date.now() : ''));
    if (!r.ok) throw new Error(r.status);
    D = await r.json(); loaded = true; loadErr = '';
  } catch { loadErr = 'Could not load the market. Try reloading the page.'; }
  refresh();
}
async function api(path, body, form) {
  const r = await fetch(path, form ? { method: 'POST', body: form } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

// ---------- demo listings (so the search can be tried before the market fills up) ----------
const DEMO_UNTIL = 10;               // demo shows while there are fewer real listings than this
let hideDemo = store.get('hideDemo', false);
const DEMO = (() => {
  let s = 20261021;
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pool = BONUSES.flatMap(b => Array(b.w === 3 ? 3 : b.w === 2 ? 2 : 1).fill(b));
  const out = [], now = Date.now();
  for (let i = 0; i < 40; i++) {
    const picked = [];
    while (picked.length < 7) { const b = pool[Math.floor(rnd() * pool.length)]; if (!picked.includes(b)) picked.push(b); }
    const st = picked.map(b => {
      let v = b.min + (b.max - b.min) * Math.pow(rnd(), 0.8);
      v = b.max >= 100 ? Math.round(v / 10) * 10 : Math.round(v);
      return [b.id, clamp(v, b.min, b.max)];
    });
    const q = st.reduce((a, [id, v]) => a + (W8[BY_ID[id].w] || 0) * pct(BY_ID[id], v), 0) / MAX_LINES;
    const price = rnd() < 0.15 ? null : Math.round(15 + q * 450 * (0.7 + rnd() * 0.6)) * 1e6;
    out.push({ id: 'demo' + i, demo: true, s: st, p: price, n: 'DemoSeller', d: '', t: '', r: null, i: 0, c: now - i * 2.7 * 3600e3, b: now - i * 2.7 * 3600e3 });
  }
  return out;
})();
const demoOn = () => loaded && !hideDemo && D.listings.length < DEMO_UNTIL;
const allListings = () => demoOn() ? D.listings.concat(DEMO) : D.listings;

// my stuff (edit keys live only in this browser)
let MINE = store.get('mine', []);              // [{kind:'listing'|'wanted', id, key}]
let MINEDATA = { listings: [], wanted: [] };
let me = store.get('me', { nick: '', contact: '' });
const saveMine = () => store.set('mine', MINE);
const isMine = (kind, id) => MINE.some(m => m.kind === kind && m.id === id);
async function loadMine() {
  if (!MINE.length) { MINEDATA = { listings: [], wanted: [] }; refresh(); return; }
  try { MINEDATA = await api('/api/mine', { items: MINE }); } catch {}
  refresh();
}

// ---------- matching ----------
const rowsOf = list => list.filter(r => r.id && BY_ID[r.id]).map(r => ({ id: r.id, min: num(r.min) || 0 }));
function matchListing(l, rows, need) {
  const map = Object.fromEntries(l.s);
  let hits = 0, sp = 0;
  const per = {};
  for (const r of rows) {
    const v = map[r.id];
    const ok = v != null && v >= r.min;
    per[r.id] = { st: v == null ? 'miss' : ok ? 'hit' : 'low', v, min: r.min };
    if (ok) { hits++; sp += pct(BY_ID[r.id], v); }
  }
  const n = rows.length, nd = need ? Math.min(need, n) : n;
  return { ok: !n || hits >= nd, hits, n, per, q: hits ? sp / hits : 0 };
}
const quality = l => Math.round(l.s.reduce((a, [id, v]) => a + (W8[BY_ID[id]?.w] || 0) * pct(BY_ID[id], v), 0) / MAX_LINES * 100);
const wantRows = w => w.w.map(([id, min]) => ({ id, min }));
const wantFits = (w, l) => matchListing(l, wantRows(w), w.k).ok;          // stats fit (price is shown separately)
const overBudget = (w, l) => w.p != null && l.p != null && l.p > w.p;
const budgetTxt = (w, l) => w.p == null ? '' : `<span class="${overBudget(w, l) ? 'bad' : 'dim'}" title="${overBudget(w, l) ? 'Your price is above their budget' : ''}">max ${fmtYang(w.p)}</span>`;

// ---------- market filter ----------
const emptyF = () => ({ rows: [], need: 0, maxp: '', sort: 'match', img: false });
let F = Object.assign(emptyF(), store.get('filter2', {}));
F.rows = (F.rows || []).filter(r => BY_ID[r.id]);
const saveF = () => store.set('filter2', F);
function fToQuery(f) {
  const q = new URLSearchParams();
  const r = rowsOf(f.rows); if (r.length) q.set('f', r.map(x => x.id + (x.min ? ':' + x.min : '')).join(','));
  if (f.need) q.set('need', f.need);
  if (f.maxp) q.set('max', f.maxp);
  if (f.sort && f.sort !== 'match') q.set('sort', f.sort);
  if (f.img) q.set('img', 1);
  return q.toString();
}
function queryToF(qs) {
  const q = new URLSearchParams(qs), f = emptyF();
  f.rows = (q.get('f') || '').split(',').map(x => x.split(':')).filter(x => BY_ID[x[0]]).map(([id, m]) => ({ id, min: m || '' }));
  f.need = Number(q.get('need')) || 0; f.maxp = q.get('max') || ''; f.sort = q.get('sort') || 'match'; f.img = q.get('img') === '1';
  return f;
}
const describe = f => {
  const r = rowsOf(f.rows);
  if (!r.length) return 'All artifacts';
  return r.map(x => bName(BY_ID[x.id]) + (x.min ? ' ' + fmtNum(x.min) + '+' : '')).join(', ') + (f.need && f.need < r.length ? ` (${f.need} of ${r.length})` : '');
};
function results(f, list = allListings()) {
  const rows = rowsOf(f.rows), maxp = parseYang(f.maxp);
  const out = list.map(l => ({ l, m: matchListing(l, rows, f.need), qv: quality(l) }))
    .filter(x => x.m.ok && (!f.img || x.l.i) && (maxp == null || isNaN(maxp) || x.l.p == null || x.l.p <= maxp));
  const byPrice = (a, b) => (a.l.p ?? Infinity) - (b.l.p ?? Infinity);
  const sorts = {
    match: (a, b) => b.m.hits - a.m.hits || (rows.length ? b.m.q - a.m.q : b.qv - a.qv) || byPrice(a, b),
    price: (a, b) => byPrice(a, b) || b.m.hits - a.m.hits,
    new: (a, b) => b.l.b - a.l.b,
    quality: (a, b) => b.qv - a.qv || byPrice(a, b),
  };
  const srt = sorts[f.sort] || sorts.match;
  out.sort((a, b) => (a.l.demo ? 1 : 0) - (b.l.demo ? 1 : 0) || srt(a, b));    // real listings always before demo ones
  return out;
}

// favourites = uložené kombinace statů (dřív „watched searches“, stejný klíč v localStorage)
let SAVED = store.get('saved', []);            // [{q, seen}]
const saveSaved = () => store.set('saved', SAVED);
const newFor = s => results(queryToF(s.q), D.listings).filter(x => x.l.c > s.seen && !isMine('listing', x.l.id)).length;

// ---------- themes (definice v index.html → window.PAM_THEMES) ----------
const THEMES = window.PAM_THEMES || { fantasy: { name: 'Dark Fantasy', mode: 'dark', fonts: '' } };
let THEME = THEMES[store.get('theme', 'fantasy')] ? store.get('theme', 'fantasy') : 'fantasy';
function applyTheme() {
  const c = THEMES[THEME], d = document.documentElement;
  d.dataset.theme = THEME; d.dataset.mode = c.mode;
  const l = $('#themefont'); const href = 'https://fonts.googleapis.com/css2?family=' + c.fonts + '&display=swap';
  if (l && c.fonts && l.href !== href) l.href = href;
  const bg = getComputedStyle(d).getPropertyValue('--bg').trim();
  const m = $('meta[name="theme-color"]'); if (m && bg) m.content = bg;
  setFx(THEME);
}

// ---------- components ----------
function bonusSelect(cls, i, val, taken) {
  const groups = GROUPS.map(g => `<optgroup label="${esc(g.en)}">${BONUSES.filter(b => b.g === g.id)
    .map(b => `<option value="${b.id}" ${b.id === val ? 'selected' : ''} ${taken.has(b.id) && b.id !== val ? 'disabled' : ''}>${esc(bName(b))}</option>`).join('')}</optgroup>`).join('');
  return `<select class="${cls}" data-i="${i}"><option value="">pick a bonus…</option>${groups}</select>`;
}
// value + what it is out of: "+20%  max" (gold) or "+5%  / 10"
const ofHTML = (b, v) => v >= b.max ? `<span class="of"><span class="mx">max</span></span>` : `<span class="of">/ ${fmtNum(b.max)}</span>`;
function lineHTML(id, v) {
  const b = BY_ID[id]; if (!b) return '';
  return `<div class="ln" title="${esc(b.name)}, range ${esc(rangeTxt(b))}">
    <span class="nm ${b.c ? 'c-' + b.c : ''}">${esc(bName(b))}</span>
    <span class="vl ${v >= b.max ? 'max' : ''}">${fmtV(b, v)}</span>${ofHTML(b, v)}</div>`;
}
// what you searched for: clear yes / no per stat
function wantHTML(m, rows) {
  const all = m.hits === m.n;
  const lines = rows.map(r => {
    const b = BY_ID[r.id], p = m.per[r.id];
    if (p.st === 'hit') return `<div class="wl ok"><span class="ic">✓</span><span class="nm ${b.c ? 'c-' + b.c : ''}">${esc(bName(b))}</span><span class="vl ${p.v >= b.max ? 'max' : ''}">${fmtV(b, p.v)}</span>${ofHTML(b, p.v)}</div>`;
    if (p.st === 'low') return `<div class="wl low"><span class="ic">✕</span><span class="nm">${esc(bName(b))}</span><span class="vl">${fmtV(b, p.v)}</span><span class="of">want ${fmtNum(p.min)}+</span></div>`;
    return `<div class="wl miss"><span class="ic">✕</span><span class="nm">${esc(bName(b))}</span><span class="vl"></span><span class="of">not on it</span></div>`;
  }).join('');
  return `<div class="want ${all ? 'all' : 'part'}"><div class="wh">${all ? (m.n === 1 ? 'Has the stat you want' : `Has all ${m.n} stats you want`) : `Has ${m.hits} of ${m.n} stats you want`}</div>${lines}</div>`;
}
function cardHTML(l, m, rows, opts = {}) {
  const searched = m && rows && rows.length ? new Set(rows.map(r => r.id)) : null;
  const rest = searched ? l.s.filter(([id]) => !searched.has(id)) : l.s;
  const own = isMine('listing', l.id);
  const priceTxt = l.p == null ? `<span class="price none">Make an offer</span>` : `<span class="price">${yangHTML(l.p)}</span>`;
  const img = opts.thumbUrl || (l.i ? `/api/img/${l.id}` : '');
  return `<article class="card ${l.demo ? 'demo' : ''}" data-id="${esc(l.id)}"${opts.i != null ? ` style="--i:${Math.min(opts.i, 14)}"` : ''}>
    <div class="chead">${priceTxt}${l.r != null ? `<span class="rk">rank ${l.r}</span>` : ''}${l.demo ? `<span class="age">demo</span>` : l.c ? timeHTML(l.c, l.b) : ''}</div>
    ${opts.top || ''}
    ${searched ? wantHTML(m, rows) : ''}
    ${rest.length ? `${searched ? `<div class="oh">Other bonuses</div>` : ''}<div class="lines">${rest.map(([id, v]) => lineHTML(id, v)).join('')}</div>` : ''}
    <div class="grow"></div>
    ${img ? `<div class="shotbox"><img class="thumb" loading="lazy" src="${esc(img)}" alt="artifact screenshot" title="Click to enlarge"></div>`
      : `<div class="shotbox none">${l.demo ? 'demo, no screenshot' : 'no screenshot'}</div>`}
    ${l.t ? `<p class="note" title="${esc(l.t)}">${esc(l.t)}</p>` : ''}
    ${opts.foot != null ? opts.foot : `<div class="cfoot">${l.demo ? `<span class="dim">Demo listing, not a real seller</span>`
      : `<span class="dim">Seller</span><button class="nick" data-contact="${esc(l.id)}" title="Whisper them in game">${esc(l.n || '…')}</button>${discordHTML(l.d)}`}
      <span class="sp"></span>
      ${l.demo ? '' : own ? `<span class="tag">yours</span>` : opts.preview ? '' : `<button class="lnk mut sm" data-report="listing:${esc(l.id)}">report</button><button class="btn sm ctc" data-contact="${esc(l.id)}">Contact</button>`}</div>`}
  </article>`;
}
function wantLines(w) {
  return w.w.map(([id, min]) => { const b = BY_ID[id]; return b ? `<div class="ln"><span class="nm">${esc(bName(b))}</span><span class="vl">${min ? fmtNum(min) + unitTxt(b) + '+' : 'any'}</span><span class="of"></span></div>` : ''; }).join('');
}
// zpráva pro prodejce/kupce: krátká, ať se vejde do chatu ve hře
function buyMsg(l, rows) {
  const ids = rows && rows.length ? rows.map(r => r.id) : [];
  const order = [...l.s].sort((a, b) => (ids.includes(b[0]) - ids.includes(a[0])) || (BY_ID[b[0]].w - BY_ID[a[0]].w));
  const st = order.slice(0, 3).map(([id, v]) => `${bName(BY_ID[id])} ${fmtV(BY_ID[id], v)}`).join(', ');
  return `Hi, I'd like to buy your pet artifact (${st})${l.p != null ? ` for ${fmtYang(l.p).replace(' ', '')}` : ''}.`;
}
function sellMsg(w) {
  const mine = MINEDATA.listings.find(l => l.st === 'active' && wantFits(w, l));
  if (mine) {
    const st = mine.s.filter(([id]) => w.w.some(x => x[0] === id)).map(([id, v]) => `${bName(BY_ID[id])} ${fmtV(BY_ID[id], v)}`).join(', ');
    return `Hi, I have a pet artifact for your request (${st})${mine.p != null ? `, ${fmtYang(mine.p).replace(' ', '')}` : ''}.`;
  }
  return `Hi, I saw your pet artifact request (${w.w.map(([id]) => bName(BY_ID[id])).join(', ')}). I might have one for you.`;
}
function openContact({ nick, discord, msg, role }) {
  $('.modal')?.remove();
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="mbox" role="dialog" aria-label="Contact ${esc(nick)}">
    <div class="row"><h2 style="margin:0">Contact ${esc(nick)}</h2><span class="sp"></span><button class="x" data-close title="Close">×</button></div>
    <p class="hint" style="margin:6px 0 14px">Whisper the ${role} in game: press <b>Shift + Enter</b>, paste the nick into the first field and the message into the second.</p>
    <div class="step"><span class="sn">1</span><div class="sb"><div class="sl">In-game nick</div><div class="row"><b class="bignick">${esc(nick)}</b><span class="sp"></span><button class="btn" data-cp="nick">Copy nick</button></div></div></div>
    <div class="step"><span class="sn">2</span><div class="sb"><div class="sl">Message <span class="dim">(you can edit it)</span></div><textarea id="cmsg" rows="3" maxlength="240">${esc(msg)}</textarea>
      <div class="row" style="margin-top:6px"><span class="dim sm" id="clen"></span><span class="sp"></span><button class="btn pri" data-cp="msg">Copy message</button></div></div></div>
    ${discord ? `<div class="step"><span class="sn"><img src="icons/discord.png" alt="" width="16" height="16"></span><div class="sb"><div class="sl">Or on Discord</div><div class="row"><b>${esc(discord)}</b><span class="sp"></span><button class="btn" data-cp="dc">Copy Discord name</button></div></div></div>` : ''}
  </div>`;
  document.body.appendChild(d);
  const ta = $('#cmsg', d), len = () => { $('#clen', d).textContent = ta.value.length + ' characters'; };
  ta.oninput = len; len();
  d.onclick = e => { if (e.target === d || e.target.closest('[data-close]')) close(); };
  const close = () => { d.remove(); removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k);
  $$('[data-cp]', d).forEach(b => b.onclick = () => {
    const w = b.dataset.cp;
    copy(w === 'nick' ? nick : w === 'dc' ? discord : ta.value, w === 'nick' ? `Copied ${nick}` : w === 'dc' ? 'Copied Discord name' : 'Copied the message');
    b.textContent = 'Copied ✓'; setTimeout(() => { b.textContent = w === 'nick' ? 'Copy nick' : w === 'dc' ? 'Copy Discord name' : 'Copy message'; }, 1600);
  });
  $('[data-cp="nick"]', d).focus();
}
function bindCommon(root) {
  $$('[data-contact]', root).forEach(b => b.onclick = () => {
    const l = D.listings.find(x => x.id === b.dataset.contact); if (!l) return;
    openContact({ nick: l.n, discord: l.d, msg: buyMsg(l, VIEW === 'market' ? rowsOf(F.rows) : []), role: 'seller' });
  });
  $$('[data-wcontact]', root).forEach(b => b.onclick = () => {
    const w = D.wanted.find(x => x.id === b.dataset.wcontact); if (!w) return;
    openContact({ nick: w.n, discord: w.d, msg: sellMsg(w), role: 'buyer' });
  });
  $$('[data-nick]', root).forEach(b => b.onclick = () => copy(b.dataset.nick, `Copied ${b.dataset.nick}. Whisper them in game.`));
  $$('[data-dc]', root).forEach(b => b.onclick = () => copy(b.dataset.dc, `Copied Discord name ${b.dataset.dc}.`));
  $$('.thumb', root).forEach(i => i.onclick = () => lightbox(i.src));
  $$('[data-report]', root).forEach(b => b.onclick = async () => {
    if (!confirm('Report this as a scam or spam? It gets hidden after 3 reports.')) return;
    const [kind, id] = b.dataset.report.split(':');
    try { await api(`/api/report/${kind}/${id}`, {}); toast('Thanks, reported.'); b.remove(); } catch (e) { toast(e.message); }
  });
}

// ---------- navigation ----------
let VIEW = 'market';
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [v, qs] = h.split('?');
  VIEW = ['market', 'sell', 'wanted', 'mine'].includes(v) ? v : 'market';
  if (VIEW === 'market' && qs) { F = queryToF(qs); saveF(); history.replaceState(null, '', '#/market'); }
  render();
}
addEventListener('hashchange', route);

function mineBadge() {
  const seen = store.get('mineSeen', 0); let n = 0;
  for (const l of MINEDATA.listings.filter(x => x.st === 'active')) n += D.wanted.filter(w => w.c > seen && !isMine('wanted', w.id) && wantFits(w, l)).length;
  for (const w of MINEDATA.wanted.filter(x => x.st === 'active')) n += D.listings.filter(l => l.c > seen && !isMine('listing', l.id) && wantFits(w, l)).length;
  return n;
}
function renderNav() {
  const savedNew = SAVED.reduce((a, s) => a + newFor(s), 0), mb = mineBadge();
  const items = [
    ['market', 'Buy', `<span class="n">${D.listings.length}</span>${savedNew ? `<span class="new" title="New listings in your favourites">${savedNew} new</span>` : ''}`],
    ['sell', 'Sell', ''],
    ['wanted', 'Wanted', `<span class="n">${D.wanted.length}</span>`],
    ['mine', 'My listings', mb ? `<span class="new">${mb}</span>` : ''],
  ];
  $('#nav').innerHTML = items.map(([k, t, x]) => `<a href="#/${k}" class="${VIEW === k ? 'on' : ''}">${t}${x}</a>`).join('');
  const hr = $('#hright');
  if (hr && !hr.childElementCount) {
    hr.innerHTML = `<label for="theme">Theme</label><select id="theme">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('')}</select>`;
    $('#theme').onchange = e => { THEME = e.target.value; store.set('theme', THEME); applyTheme(); if (VIEW === 'market') renderResults(true); };
  }
  if ($('#theme')) $('#theme').value = THEME;
  const tot = savedNew + mb;
  document.title = (tot ? `(${tot}) ` : '') + 'Pet Artifact Market · Jinteia';
}
function render() {
  renderNav();
  ({ market: renderMarket, sell: renderSell, wanted: renderWanted, mine: renderMine })[VIEW]($('#main'));
}
// after data loads, only re-render the parts without half-typed inputs
function refresh() {
  renderNav();
  if (VIEW === 'market') { renderFavs(); renderResults(); }
  else if (VIEW === 'wanted') renderWantedList();
  else if (VIEW === 'mine') renderMineList();
  else if (VIEW === 'sell') renderSellSide();
}

// ============================================================
//  MARKET (buy)
// ============================================================
let statQ = '';
function renderMarket(main) {
  main.innerHTML = `<div class="view v-market">
    <aside class="side picker">
      <div class="favs" id="favs"></div>
      <h2>Search by stats</h2>
      <div id="picked"></div>
      <input id="sq" class="sq" placeholder="Find a stat, e.g. portal" value="${esc(statQ)}" autocomplete="off">
      <div id="statlist" class="statlist"></div>
    </aside>
    <section class="body">
      <div class="toolbar" id="toolbar"></div>
      <div id="results"></div>
    </section></div>`;
  $('#sq').oninput = e => { statQ = e.target.value; renderStatList(); };
  $('#sq').onkeydown = e => {
    if (e.key !== 'Enter') return;
    const first = $('#statlist .sitem:not(.on)'); if (!first) return;
    const id = first.dataset.row; e.target.value = statQ = '';
    toggleStat(id); focusMin(id);
  };
  renderFavs(); renderPicked(); renderStatList(); renderToolbar(); renderResults(true);
}
function focusMin(id) {
  const x = $(`#statlist [data-min="${id}"]`); if (!x) return;
  x.focus(); const n = x.value.length; try { x.setSelectionRange(n, n); } catch {}
  x.closest('.sitem')?.scrollIntoView({ block: 'nearest' });
}
function filterChanged(full) {
  saveF();
  if (full) { renderPicked(); renderStatList(); renderToolbar(); }
  renderFavs(); renderResults(full);
}
function toggleStat(id) {
  const i = F.rows.findIndex(r => r.id === id);
  if (i >= 0) F.rows.splice(i, 1); else F.rows.push({ id, min: '' });
  if (F.need >= F.rows.length) F.need = 0;
  filterChanged(true);
}
// favourites: saved stat combos, one click to switch between hunts
function renderFavs() {
  const el = $('#favs'); if (!el) return;
  const cur = fToQuery(F), has = F.rows.length > 0, saved = SAVED.some(s => s.q === cur);
  el.innerHTML = `<div class="favh"><h3>Favourites</h3>${SAVED.length ? `<span class="dim sm">${SAVED.length}</span>` : ''}<span class="sp"></span>
      <button class="lnk sm" id="favsave" ${!has || saved ? 'disabled' : ''} title="Save the stats you picked below">${saved ? '★ saved' : '☆ save current'}</button></div>
    ${SAVED.length ? `<div class="favlist">${SAVED.map((s, i) => { const f = queryToF(s.q), rows = rowsOf(f.rows), nw = newFor(s), cnt = results(f).length;
      return `<div class="fav ${s.q === cur ? 'on' : ''}" data-fav="${i}" tabindex="0">
        <div class="favtop"><span class="st">★</span><span class="fc">${nw ? `<span class="new">${nw} new</span>` : `${plural(cnt, 'match', 'matches')}`}</span>
          ${f.need && f.need < rows.length ? `<span class="dim sm">${f.need} of ${rows.length}</span>` : ''}${f.maxp ? `<span class="dim sm">≤ ${esc(f.maxp)}</span>` : ''}<span class="sp"></span><button class="x" data-favdel="${i}" title="Remove from favourites">×</button></div>
        <div class="favstats">${rows.map(r => { const b = BY_ID[r.id]; return `<span class="fs"><span class="${b.c ? 'c-' + b.c : ''}">${esc(bName(b))}</span>${r.min ? `<b>${fmtNum(r.min)}${unitTxt(b)}+</b>` : ''}</span>`; }).join('')}</div>
      </div>`; }).join('')}</div>`
      : `<p class="favnone">Hunting the same stats often? Pick them below and press “save current”. Then switch with one click, and see when new matches show up.</p>`}`;
  $('#favsave').onclick = () => {
    if (!F.rows.length) return;
    if (!SAVED.some(s => s.q === cur)) { SAVED.unshift({ q: cur, seen: Date.now() }); saveSaved(); }
    renderFavs(); renderNav();
  };
  $$('[data-fav]', el).forEach(d => {
    const go = () => { const s = SAVED[+d.dataset.fav]; F = queryToF(s.q); s.seen = Date.now(); saveSaved(); filterChanged(true); renderNav(); };
    d.onclick = e => { if (!e.target.closest('[data-favdel]')) go(); };
    d.onkeydown = e => { if (e.key === 'Enter') go(); };
  });
  $$('[data-favdel]', el).forEach(b => b.onclick = () => { SAVED.splice(+b.dataset.favdel, 1); saveSaved(); renderFavs(); renderNav(); });
}
function renderPicked() {
  const el = $('#picked'); if (!el) return;
  el.innerHTML = F.rows.length
    ? `<p class="picked">You want ${F.rows.map(r => `<b>${esc(bName(BY_ID[r.id]))}${num(r.min) ? ' ' + fmtNum(num(r.min)) + '+' : ''}</b>`).join(', ')} · <button class="lnk sm" id="pclr">clear</button></p>`
    : `<p class="picked">Click a stat to pick it, or type a minimum next to it.</p>`;
  $('#pclr')?.addEventListener('click', () => { F.rows = []; F.need = 0; filterChanged(true); });
}
function renderStatList() {
  const el = $('#statlist'); if (!el) return;
  const q = statQ.trim().toLowerCase().replace(/^vs\.?\s*/, '');
  const on = new Map(F.rows.map(r => [r.id, r]));
  const hit = b => !q || b.s.toLowerCase().includes(q) || b.name.toLowerCase().includes(q);
  const html = GROUPS.map((g, gi) => {
    const bs = BONUSES.filter(b => b.g === g.id && hit(b)); if (!bs.length) return '';
    return `<div class="sg"><div class="sgh"><span>${esc(g.en)}</span>${gi === 0 || q ? '<span class="mn">min</span>' : ''}</div>${bs.map(b => { const r = on.get(b.id);
      return `<div class="sitem ${r ? 'on' : ''}" data-row="${b.id}">
        <button class="tg" data-pick="${b.id}" title="${esc(b.name)}"><span class="ck">${r ? '✓' : '+'}</span><span class="nm ${b.c ? 'c-' + b.c : ''}">${esc(bName(b))}</span></button>
        <input data-min="${b.id}" type="text" inputmode="decimal" autocomplete="off" placeholder="${r ? 'any' : 'min'}" value="${esc(r ? r.min : '')}" title="Minimum ${esc(bName(b))} (${esc(rangeTxt(b))})">
        <span class="rg">/ ${fmtNum(b.max)}${unitTxt(b)}</span></div>`; }).join('')}</div>`;
  }).join('');
  el.innerHTML = html || `<p class="hint">No stat called “${esc(statQ)}”.</p>`;
  $$('[data-pick]', el).forEach(b => b.onclick = () => toggleStat(b.dataset.pick));
  $$('[data-min]', el).forEach(x => x.oninput = () => {
    const id = x.dataset.min, v = x.value.replace(/[^\d.,]/g, '');
    if (v !== x.value) x.value = v;
    let r = F.rows.find(r => r.id === id);
    if (!r) {                                   // typing a value picks the stat
      if (!v) return;
      F.rows.push({ id, min: v }); saveF();
      renderPicked(); renderStatList(); renderToolbar(); renderFavs(); renderResults();
      focusMin(id); return;
    }
    r.min = v; saveF(); renderPicked(); renderFavs(); renderResults();
  });
}
function renderToolbar() {
  const el = $('#toolbar'); if (!el) return;
  const n = F.rows.length;
  el.innerHTML = `
    <label>Must have <select id="fneed">
      <option value="0">${n > 1 ? `all ${n} stats` : 'all picked stats'}</option>
      ${Array.from({ length: Math.max(0, n - 1) }, (_, k) => `<option value="${k + 1}" ${F.need === k + 1 ? 'selected' : ''}>at least ${k + 1} of ${n}</option>`).join('')}</select></label>
    <label>Max price <input id="fmax" placeholder="e.g. 200kk" value="${esc(F.maxp)}" class="${isNaN(parseYang(F.maxp)) ? 'bad' : ''}"></label>
    <label>Sort <select id="fsort">${[['match', 'best match'], ['price', 'lowest price'], ['new', 'newest'], ['quality', 'best overall rolls']]
      .map(([k, t]) => `<option value="${k}" ${F.sort === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="chk"><input type="checkbox" id="fimg" ${F.img ? 'checked' : ''}> With screenshot</label>
    <span class="sp"></span>
    <button class="lnk" id="fshare">Copy link</button>
    <button class="lnk" id="fwtb" title="Let sellers know what you are looking for">Post as wanted</button>`;
  $('#fneed').onchange = e => { F.need = +e.target.value; filterChanged(); };
  $('#fmax').oninput = e => { F.maxp = e.target.value; e.target.classList.toggle('bad', isNaN(parseYang(e.target.value))); filterChanged(); };
  $('#fsort').onchange = e => { F.sort = e.target.value; filterChanged(); };
  $('#fimg').onchange = e => { F.img = e.target.checked; filterChanged(); };
  $('#fshare').onclick = () => copy(location.origin + location.pathname + '#/market?' + fToQuery(F), 'Search link copied');
  $('#fwtb').onclick = () => {
    const r = rowsOf(F.rows); if (!r.length) { toast('Pick at least one stat first.'); return; }
    WF.rows = r.map(x => ({ id: x.id, min: x.min || '' })); WF.need = F.need; WF.maxp = F.maxp; saveWF(); location.hash = '#/wanted';
  };
}
let resultsShown = false;
function renderResults(animate) {
  const el = $('#results'); if (!el) return;
  if (!loaded) { el.innerHTML = `<div class="empty">${loadErr || 'Loading the market…'}</div>`; return; }
  if (!resultsShown) { animate = true; resultsShown = true; }   // první zobrazení po načtení dat
  const list = results(F), rows = rowsOf(F.rows);
  const real = list.filter(x => !x.l.demo);
  const prices = real.map(x => x.l.p).filter(p => p != null);
  const sold = D.sold.filter(s => matchListing(s, rows, F.need).ok && s.p != null).map(s => s.p);
  const demoNote = demoOn() ? `<div class="demonote">The market is just starting, so ${DEMO.length} <b>demo listings</b> are mixed in to let you try the search. They go away once ${DEMO_UNTIL} real listings are up. <button class="lnk" id="hidedemo">Hide demo</button></div>`
    : (hideDemo && D.listings.length < DEMO_UNTIL) ? `<div class="demonote slim"><button class="lnk" id="showdemo">Show demo listings</button></div>` : '';
  const head = `<div class="rhead"><h2>${rows.length ? `${plural(list.length, 'listing')} match` : plural(list.length, 'listing')}</h2>
    ${prices.length ? `<span class="pricebar">asking from <b>${fmtYang(Math.min(...prices))}</b>${prices.length > 2 ? `, typical <b>${fmtYang(median(prices))}</b>` : ''} yang</span>` : ''}
    ${sold.length ? `<span class="pricebar">recently sold for <b>${fmtYang(median(sold))}</b> <span class="dim">(median of ${sold.length})</span></span>` : ''}</div>`;
  let body;
  if (!list.length) {
    body = `<div class="empty"><p>${allListings().length ? 'Nothing matches yet.' : 'The market is empty so far.'}</p>
      <p>${rows.length ? `${rows.length > 1 ? `Try “at least 1 of ${rows.length}”, lower a minimum, ` : 'Lower the minimum, '}save it to favourites to spot new matches, or <button class="lnk" id="ewtb">post it as wanted</button> so sellers find you.` : `<a href="#/sell">List the first artifact</a>`}</p></div>`;
  } else {
    body = `<div class="cards ${animate ? 'reveal' : ''}">${list.slice(0, 300).map((x, i) => cardHTML(x.l, x.m, rows, { i })).join('')}</div>
      ${list.length > 300 ? `<p class="hint">Showing the first 300. Narrow the search.</p>` : ''}`;
  }
  el.innerHTML = head + demoNote + body;
  $('#ewtb')?.addEventListener('click', () => $('#fwtb').click());
  $('#hidedemo')?.addEventListener('click', () => { hideDemo = true; store.set('hideDemo', true); renderResults(); });
  $('#showdemo')?.addEventListener('click', () => { hideDemo = false; store.set('hideDemo', false); renderResults(); });
  bindCommon(el);
}

// ============================================================
//  SELL
// ============================================================
const emptyS = () => ({ rows: Array.from({ length: MAX_LINES }, () => ({ id: '', v: '' })), price: '', rank: '', note: '' });
let S = Object.assign(emptyS(), store.get('sellDraft', {}));
const saveS = () => store.set('sellDraft', S);
const SI = { blob: null, url: '', full: '', msg: '', cls: '', miss: [], busy: false, err: '' };
const sellRows = () => S.rows.filter(r => r.id && BY_ID[r.id] && num(r.v) != null).map(r => [r.id, num(r.v)]);

function renderSell(main) {
  main.innerHTML = `<div class="view v-sell">
    <aside class="side" id="sshot"></aside>
    <section class="side" id="sform"></section>
    <section class="body" id="sside"></section></div>`;
  renderShot(); renderSellForm(); renderSellSide();
}
function renderShot() {
  const el = $('#sshot'); if (!el) return;
  el.innerHTML = `<h2>1. Screenshot</h2>
    <div class="drop" id="drop" tabindex="0"><span class="big">Paste your artifact screenshot</span>
      Press Ctrl+V, drop the image here, or <b>click to pick a file</b>.
      <input type="file" id="sfile" accept="image/*" hidden></div>
    <p class="ocrmsg ${SI.cls}">${esc(SI.msg)}</p>
    ${SI.url ? `<div class="shot"><img src="${esc(SI.url)}" alt="" id="shotimg" title="Buyers will see this">
      <p class="hint">Buyers see this crop, so they know the numbers are real.</p><div class="row" style="gap:16px;margin-top:2px">
      ${SI.full ? `<button class="lnk sm" id="sfull">use the whole image</button>` : ''}<button class="lnk mut sm" id="sdel">remove image</button></div></div>` : ''}
    ${SI.miss.length ? `<p class="miss">Could not read these lines, add them by hand: ${SI.miss.map(esc).join(' · ')}</p>` : ''}
    <p class="hint" style="margin-top:14px">Tip: hover the artifact in game, press Win+Shift+S, cut out the tooltip and paste it here. The text is read in your browser.</p>`;
  const drop = $('#drop'), file = $('#sfile');
  drop.onclick = () => file.click();
  drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
  file.onchange = () => file.files[0] && handleShot(file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/')); if (f) handleShot(f); };
  $('#shotimg')?.addEventListener('click', () => lightbox(SI.url));
  $('#sdel')?.addEventListener('click', () => { SI.blob = null; SI.url = ''; SI.full = ''; SI.msg = ''; SI.miss = []; renderShot(); renderSellSide(); });
  $('#sfull')?.addEventListener('click', async () => {
    const im = await loadImg(SI.full); const b = await makeThumb(im, null);
    if (b) { SI.blob = b; SI.url = URL.createObjectURL(b); } SI.full = ''; renderShot(); renderSellSide();
  });
}
addEventListener('paste', e => {
  if (VIEW !== 'sell') return;
  const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (it) { e.preventDefault(); handleShot(it.getAsFile()); }
});
async function handleShot(file) {
  if (SI.busy) return;
  SI.busy = true; SI.msg = 'Loading the text reader…'; SI.cls = ''; SI.miss = []; renderShot();
  try {
    const r = await readScreenshot(file, st => { if (st === 'read') { SI.msg = 'Reading the bonuses…'; renderShot(); } });
    SI.full = r.url; SI.blob = r.thumb; SI.url = r.thumb ? URL.createObjectURL(r.thumb) : '';
    SI.miss = r.miss.filter(l => l.length < 80).slice(0, 6);
    if (!r.found.length) {
      SI.msg = 'No bonus found. Try a tighter crop of just the tooltip, or fill in the rows by hand.'; SI.cls = 'err';
    } else {
      S.rows = Array.from({ length: MAX_LINES }, (_, i) => r.found[i] ? { id: r.found[i].id, v: String(r.found[i].v) } : { id: '', v: '' });
      saveS();
      SI.msg = `Found ${plural(r.found.length, 'bonus', 'bonuses')}. Check the numbers on the right.`; SI.cls = 'ok';
    }
  } catch (e) {
    SI.msg = e.message === 'net' ? 'Could not load the text reader. Are you online?' : 'Reading failed. Fill in the rows by hand.';
    SI.cls = 'err';
  }
  SI.busy = false; renderShot(); renderSellForm(); renderSellSide();
}
function renderSellForm() {
  const el = $('#sform'); if (!el) return;
  const taken = new Set(S.rows.map(r => r.id).filter(Boolean));
  el.innerHTML = `<h2>2. Check the bonuses</h2>
    <div class="srows">${S.rows.map((r, i) => { const b = BY_ID[r.id], v = num(r.v), bad = b && v != null && (v < b.min || v > b.max * 2);
      return `<div class="srow n"><span class="no">${i + 1}.</span>${bonusSelect('sb', i, r.id, taken)}
        <input class="svl ${bad ? 'bad' : ''}" data-i="${i}" type="number" inputmode="decimal" step="any" placeholder="${b ? esc(rangeTxt(b)) : 'value'}" value="${esc(r.v)}" ${b ? '' : 'disabled'}>
        <button class="x" data-sdel="${i}" title="Clear row" ${r.id ? '' : 'style="visibility:hidden"'}>×</button></div>`; }).join('')}</div>
    <h2 style="margin-top:20px">3. Price and contact</h2>
    <div class="grid2">
      <div><label class="f" for="sprice">Price in yang</label><input id="sprice" placeholder="e.g. 150kk, empty = offers" value="${esc(S.price)}"></div>
      <div><label class="f" for="srank">Artifact rank <span class="dim">(optional)</span></label><input id="srank" type="number" min="0" max="30" value="${esc(S.rank)}"></div>
      <div><label class="f" for="snick">Your in-game nick</label><input id="snick" maxlength="24" value="${esc(me.nick)}"></div>
      <div><label class="f" for="scontact">Discord <span class="dim">(optional)</span></label><input id="scontact" maxlength="40" value="${esc(me.contact)}"></div>
    </div>
    <label class="f" for="snote">Note <span class="dim">(optional)</span></label>
    <textarea id="snote" maxlength="200" placeholder="e.g. online evenings, CH1, open to trades">${esc(S.note)}</textarea>
    <p class="err" id="serr">${esc(SI.err)}</p>
    <div class="row"><button class="btn pri" id="ssend">Post listing</button><span class="sp"></span><button class="lnk mut" id="sclr">Clear form</button></div>
    <p class="hint">Listings stay up for 14 days. Renew them with one click under My listings.</p>`;

  const upd = () => { saveS(); renderSellSide(); };
  $$('.sb', el).forEach(s => s.onchange = () => { const r = S.rows[+s.dataset.i]; r.id = s.value; if (!s.value) r.v = ''; saveS(); renderSellForm(); renderSellSide(); $(`.svl[data-i="${s.dataset.i}"]`)?.focus(); });
  $$('input.svl', el).forEach(x => x.oninput = () => {
    S.rows[+x.dataset.i].v = x.value; const b = BY_ID[S.rows[+x.dataset.i].id], v = num(x.value);
    x.classList.toggle('bad', !!(b && v != null && (v < b.min || v > b.max * 2))); upd();
  });
  $$('[data-sdel]', el).forEach(b => b.onclick = () => { S.rows[+b.dataset.sdel] = { id: '', v: '' }; saveS(); renderSellForm(); renderSellSide(); });
  $('#sprice').oninput = e => { S.price = e.target.value; e.target.classList.toggle('bad', isNaN(parseYang(e.target.value))); upd(); };
  $('#srank').oninput = e => { S.rank = e.target.value; upd(); };
  $('#snote').oninput = e => { S.note = e.target.value; upd(); };
  $('#snick').oninput = e => { me.nick = e.target.value.trim(); store.set('me', me); renderSellSide(); };
  $('#scontact').oninput = e => { me.contact = e.target.value.trim(); store.set('me', me); };
  $('#sclr').onclick = () => { S = emptyS(); saveS(); SI.blob = null; SI.url = ''; SI.full = ''; SI.msg = ''; SI.miss = []; SI.err = ''; renderShot(); renderSellForm(); renderSellSide(); };
  $('#ssend').onclick = submitListing;
}
function draftListing() {
  const p = parseYang(S.price);
  return { id: 'preview', s: sellRows(), p: p == null || isNaN(p) ? null : p, n: me.nick, d: me.contact, t: S.note.trim(), r: S.rank === '' ? null : Number(S.rank), i: 0, c: 0, b: 0 };
}
function similar(l) {
  const keys = l.s.filter(([id, v]) => BY_ID[id].w >= 3 && pct(BY_ID[id], v) >= 0.4).map(([id]) => ({ id, min: 0 }));
  if (!keys.length) return null;
  keys.sort((a, b) => pct(BY_ID[b.id], l.s.find(x => x[0] === b.id)[1]) - pct(BY_ID[a.id], l.s.find(x => x[0] === a.id)[1]));
  const rows = keys.slice(0, 2);
  const act = D.listings.filter(x => !isMine('listing', x.id) && matchListing(x, rows, 0).ok && x.p != null).map(x => x.p);
  const sold = D.sold.filter(x => matchListing(x, rows, 0).ok && x.p != null).map(x => x.p);
  return { rows, act, sold };
}
function renderSellSide() {
  const el = $('#sside'); if (!el) return;
  const l = draftListing();
  if (!l.s.length) {
    el.innerHTML = `<h2>Preview</h2><p class="mut">Paste a screenshot or fill in the bonuses. Here you will see your listing, who is looking for it, and what similar artifacts go for.</p>`;
    return;
  }
  const fits = D.wanted.filter(w => !isMine('wanted', w.id) && wantFits(w, l));
  const sim = similar(l);
  el.innerHTML = `<h2>Preview</h2>
    <div class="preview">${cardHTML(l, null, null, { preview: true, thumbUrl: SI.url })}</div>
    <h3>${fits.length ? `${plural(fits.length, 'buyer')} ${fits.length === 1 ? 'is' : 'are'} looking for this` : 'Buyers looking for this'}</h3>
    ${fits.length ? `<div class="wlist">${fits.slice(0, 6).map(w => `<div class="wi"><div class="row"><button class="nick" data-nick="${esc(w.n)}">${esc(w.n)}</button>${discordHTML(w.d)}<span class="sp"></span>${budgetTxt(w, l)}</div>
      <div class="wst sm">${w.w.map(([id, min]) => `<b>${esc(bName(BY_ID[id]))}</b>${min ? ' ' + fmtNum(min) + '+' : ''}`).join(' · ')}</div></div>`).join('')}</div>
      <p class="hint">Click a nick to copy it and whisper them in game.</p>`
      : `<p class="mut sm">Nobody has posted a wanted request for these stats yet.</p>`}
    ${sim ? `<h3>What similar artifacts go for</h3>
      <p class="mut sm" style="margin:0 0 6px">Artifacts that also have ${sim.rows.map(r => esc(bName(BY_ID[r.id]))).join(' + ')}:</p>
      <p class="sm" style="margin:0">${sim.act.length ? `listed ${sim.act.length}×, from <b>${fmtYang(Math.min(...sim.act))}</b>, typical <b>${fmtYang(median(sim.act))}</b>` : 'None listed right now.'}</p>
      <p class="sm" style="margin:2px 0 0">${sim.sold.length ? `sold ${sim.sold.length}× recently, median <b>${fmtYang(median(sim.sold))}</b>` : `<span class="dim">No sales recorded yet.</span>`}</p>` : ''}`;
  bindCommon(el);
}
async function submitListing() {
  const btn = $('#ssend'), errEl = $('#serr');
  const stats = sellRows(), p = parseYang(S.price);
  const say = m => { SI.err = m; errEl.textContent = m; };
  if (!stats.length) return say('Fill in at least one bonus with a value.');
  const bad = stats.find(([id, v]) => v < BY_ID[id].min || v > BY_ID[id].max * 2);
  if (bad) return say(`${bName(BY_ID[bad[0]])} is outside its range ${rangeTxt(BY_ID[bad[0]])}.`);
  if (isNaN(p)) return say('Write the price as a number, e.g. 150kk or 1.5kkk.');
  if (!NICK_RE.test(me.nick)) return say('Enter your in-game nick so buyers can whisper you.');
  say(''); btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('data', JSON.stringify({ stats, price: p, nick: me.nick, contact: me.contact, note: S.note, rank: S.rank === '' ? null : Number(S.rank) }));
    if (SI.blob) fd.append('img', SI.blob, 'artifact.jpg');
    const r = await api('/api/listings', null, fd);
    MINE.unshift({ kind: 'listing', id: r.id, key: r.key }); saveMine();
    S = emptyS(); saveS(); SI.blob = null; SI.url = ''; SI.full = ''; SI.msg = ''; SI.miss = []; SI.err = '';
    toast('Your listing is live.');
    await Promise.all([loadMarket(true), loadMine()]);
    location.hash = '#/mine';
  } catch (e) { say(e.message); }
  btn.disabled = false;
}

// ============================================================
//  WANTED
// ============================================================
const emptyWF = () => ({ rows: [], need: 0, maxp: '', note: '' });
let WF = Object.assign(emptyWF(), store.get('wantDraft', {}));
const saveWF = () => store.set('wantDraft', WF);
let wOnlyMine = false;
function renderWanted(main) {
  main.innerHTML = `<div class="view v-wanted">
    <aside class="side" id="wform"></aside>
    <section class="body" id="wlist"></section></div>`;
  renderWantedForm(); renderWantedList();
}
function renderWantedForm() {
  const el = $('#wform'); if (!el) return;
  WF.rows = (WF.rows || []).filter(r => r.id);
  const rows = [...WF.rows, { id: '', min: '' }];
  const taken = new Set(WF.rows.map(r => r.id)), n = WF.rows.length;
  el.innerHTML = `<h2>Post a wanted request</h2>
    <p class="hint" style="margin:-4px 0 12px">Say which stats you want. Anyone who lists a matching artifact sees your nick right away.</p>
    <div class="srows">${rows.map((r, i) => `<div class="srow">${bonusSelect('wb', i, r.id, taken)}
      <input class="wm" data-i="${i}" type="number" inputmode="decimal" min="0" step="any" placeholder="min" title="${esc(rangeTxt(BY_ID[r.id]))}" value="${esc(r.min)}" ${r.id ? '' : 'disabled'}>
      <button class="x" data-wdel="${i}" ${r.id ? '' : 'style="visibility:hidden"'}>×</button></div>`).join('')}</div>
    <div class="grid2">
      <div><label class="f" for="wneed">Must have</label><select id="wneed"><option value="0">${n > 1 ? `all ${n} stats` : 'all picked stats'}</option>
        ${Array.from({ length: Math.max(0, n - 1) }, (_, k) => `<option value="${k + 1}" ${WF.need === k + 1 ? 'selected' : ''}>at least ${k + 1} of ${n}</option>`).join('')}</select></div>
      <div><label class="f" for="wmax">I pay up to</label><input id="wmax" placeholder="e.g. 300kk" value="${esc(WF.maxp)}"></div>
      <div><label class="f" for="wnick">Your in-game nick</label><input id="wnick" maxlength="24" value="${esc(me.nick)}"></div>
      <div><label class="f" for="wcontact">Discord <span class="dim">(optional)</span></label><input id="wcontact" maxlength="40" value="${esc(me.contact)}"></div>
    </div>
    <label class="f" for="wnote">Note <span class="dim">(optional)</span></label>
    <textarea id="wnote" maxlength="200">${esc(WF.note)}</textarea>
    <p class="err" id="werr"></p>
    <div class="row"><button class="btn pri" id="wsend">Post request</button><span class="sp"></span><button class="lnk" id="wsearch">Search the market first</button></div>`;
  const ch = full => { saveWF(); if (full) renderWantedForm(); };
  $$('.wb', el).forEach(s => s.onchange = () => {
    const i = +s.dataset.i;
    if (i < WF.rows.length) { if (s.value) WF.rows[i] = { id: s.value, min: '' }; else WF.rows.splice(i, 1); }
    else if (s.value) WF.rows.push({ id: s.value, min: '' });
    WF.need = 0; ch(true); $(`.wm[data-i="${WF.rows.findIndex(x => x.id === s.value)}"]`)?.focus();
  });
  $$('.wm', el).forEach(x => x.oninput = () => { const r = WF.rows[+x.dataset.i]; if (r) r.min = x.value; ch(); });
  $$('[data-wdel]', el).forEach(b => b.onclick = () => { WF.rows.splice(+b.dataset.wdel, 1); WF.need = 0; ch(true); });
  $('#wneed').onchange = e => { WF.need = +e.target.value; ch(); };
  $('#wmax').oninput = e => { WF.maxp = e.target.value; ch(); };
  $('#wnote').oninput = e => { WF.note = e.target.value; ch(); };
  $('#wnick').oninput = e => { me.nick = e.target.value.trim(); store.set('me', me); };
  $('#wcontact').oninput = e => { me.contact = e.target.value.trim(); store.set('me', me); };
  $('#wsearch').onclick = () => { F = { ...emptyF(), rows: rowsOf(WF.rows).map(r => ({ id: r.id, min: r.min ? String(r.min) : '' })), need: WF.need, maxp: WF.maxp }; saveF(); location.hash = '#/market'; };
  $('#wsend').onclick = async () => {
    const err = $('#werr'), rows = rowsOf(WF.rows), p = parseYang(WF.maxp);
    if (!rows.length) { err.textContent = 'Pick at least one stat.'; return; }
    if (isNaN(p)) { err.textContent = 'Write the price as a number, e.g. 300kk.'; return; }
    if (!NICK_RE.test(me.nick)) { err.textContent = 'Enter your in-game nick.'; return; }
    err.textContent = ''; $('#wsend').disabled = true;
    try {
      const r = await api('/api/wanted', { want: rows.map(x => [x.id, x.min]), need: WF.need, maxPrice: p, nick: me.nick, contact: me.contact, note: WF.note });
      MINE.unshift({ kind: 'wanted', id: r.id, key: r.key }); saveMine();
      WF = emptyWF(); saveWF(); toast('Your request is live.');
      await Promise.all([loadMarket(true), loadMine()]); renderWantedForm();
    } catch (e) { err.textContent = e.message; }
    const b = $('#wsend'); if (b) b.disabled = false;
  };
}
function renderWantedList() {
  const el = $('#wlist'); if (!el) return;
  if (!loaded) { el.innerHTML = `<div class="empty">${loadErr || 'Loading…'}</div>`; return; }
  const myL = MINEDATA.listings.filter(l => l.st === 'active');
  let list = D.wanted.map(w => ({ w, fit: myL.filter(l => wantFits(w, l)), cnt: D.listings.filter(l => wantFits(w, l)).length }));
  if (wOnlyMine) list = list.filter(x => x.fit.length);
  el.innerHTML = `<div class="rhead"><h2>${plural(D.wanted.length, 'wanted request')}</h2>
      ${myL.length ? `<label class="chk" style="margin:0"><input type="checkbox" id="wonly" ${wOnlyMine ? 'checked' : ''}> only where my artifact fits</label>` : ''}</div>
    ${list.length ? `<div class="wcards">${list.map(({ w, fit, cnt }) => `<article class="wcard">
      <div class="chead">${w.p != null ? `<span class="price"><span class="upto">up to</span>${yangHTML(w.p)}</span>` : `<span class="price none">Price open</span>`}${timeHTML(w.c, w.b)}</div>
      <div class="lines">${wantLines(w)}</div>
      ${w.k < w.w.length ? `<span class="mut sm">${w.k} of ${w.w.length} is enough</span>` : ''}
      ${w.t ? `<p class="note">${esc(w.t)}</p>` : ''}
      <div class="row sm">${cnt ? `<a href="#" data-wgo="${esc(w.id)}">${plural(cnt, 'listing')} match →</a>` : `<span class="dim">no listing matches yet</span>`}<span class="sp"></span>${fit.length ? `<span class="tag">your artifact fits (${fit.length})</span>` : ''}</div>
      <div class="cfoot"><span class="dim">Buyer</span><button class="nick" data-wcontact="${esc(w.id)}" title="Whisper them in game">${esc(w.n)}</button>${discordHTML(w.d)}<span class="sp"></span>
        ${isMine('wanted', w.id) ? `<span class="tag">yours</span>` : `<button class="btn sm ctc" data-wcontact="${esc(w.id)}">Contact</button>`}</div>
    </article>`).join('')}</div>`
    : `<div class="empty">${wOnlyMine ? 'Nobody is asking for your artifacts right now.' : 'No wanted requests yet. Be the first.'}</div>`}`;
  $('#wonly')?.addEventListener('change', e => { wOnlyMine = e.target.checked; renderWantedList(); });
  $$('[data-wgo]', el).forEach(a => a.onclick = e => { e.preventDefault(); goWanted(D.wanted.find(w => w.id === a.dataset.wgo)); });
  bindCommon(el);
}
function goWanted(w) {
  if (!w) return;
  F = { ...emptyF(), rows: w.w.map(([id, min]) => ({ id, min: min ? String(min) : '' })), need: w.k < w.w.length ? w.k : 0, maxp: w.p != null ? yangInput(w.p) : '' };
  saveF(); location.hash = '#/market';
}

// ============================================================
//  MY LISTINGS
// ============================================================
let EDIT = null;   // {id, mode:'sold'|'price'}
function renderMine(main) {
  main.innerHTML = `<div class="view v-mine">
    <section class="body" id="mlist"></section>
    <aside class="side" id="mkeys" style="border-right:0;border-left:1px solid var(--line)"></aside></div>`;
  renderMineList(); renderKeys(); loadMine();
  setTimeout(() => { store.set('mineSeen', Date.now()); }, 1500);
}
const statusTxt = st => ({ active: 'live', sold: 'sold', expired: 'expired', hidden: 'hidden after reports' }[st] || st);
function renderMineList() {
  const el = $('#mlist'); if (!el) return;
  const L = MINEDATA.listings, Wn = MINEDATA.wanted;
  const stl = s => s.map(([id, v]) => `${esc(bName(BY_ID[id]))} <b>${fmtV(BY_ID[id], v)}</b>`).join(' · ');
  const stchip = (st, extra = '') => `<span class="stchip ${st}">${statusTxt(st)}${extra}</span>`;
  el.innerHTML = `<div class="rhead"><h2>My listings</h2>${L.length ? `<span class="mut sm">${L.filter(l => l.st === 'active').length} live</span>` : ''}<a href="#/sell" class="sm">+ sell another</a></div>
    ${L.length ? `<div class="cards mine">${L.map(l => {
      const fits = l.st === 'active' ? D.wanted.filter(w => !isMine('wanted', w.id) && wantFits(w, l)) : [];
      const ed = EDIT && EDIT.id === l.id ? EDIT.mode : '';
      const top = `<div class="mstat">${stchip(l.st, l.st === 'sold' && l.sp != null ? ' for ' + fmtYang(l.sp) : '')}${l.st === 'active' ? `<span class="dim sm" data-exp="1" data-tc="${l.c}" data-tb="${l.b}" title="Posted ${fmtDate(l.c)}">${left(l.b)}</span>` : ''}</div>`;
      const foot = `${fits.length ? `<div class="fits">Wanted by ${fits.slice(0, 4).map(w => `<button class="nick" data-wcontact="${esc(w.id)}">${esc(w.n)}</button>${w.p != null ? ` (${budgetTxt(w, l)})` : ''}`).join(', ')}${fits.length > 4 ? ` +${fits.length - 4}` : ''}</div>` : ''}
        ${ed ? `<div class="edit"><span class="sm mut">${ed === 'sold' ? 'Sold for' : 'New price'}</span><input id="edv" value="${esc(yangInput(l.p))}" placeholder="150kk"><button class="btn sm" id="edok">Save</button><button class="lnk mut sm" id="edno">cancel</button></div>` : ''}
        <div class="cfoot macts">${l.st === 'active' ? `<button class="lnk" data-act="sold" data-id="${l.id}">mark sold</button><button class="lnk" data-act="price" data-id="${l.id}">price</button>` : ''}
          ${l.st !== 'hidden' ? `<button class="lnk" data-act="bump" data-id="${l.id}">${l.st === 'active' ? 'renew' : 'list again'}</button>` : ''}<span class="sp"></span>
          <button class="lnk bad" data-act="delete" data-id="${l.id}">delete</button></div>`;
      return cardHTML(l, null, null, { top, foot }); }).join('')}</div>` : `<p class="mut">Nothing here yet. Listings you post from this browser show up here.</p>`}
    <div class="rhead" style="margin-top:28px"><h2>My wanted requests</h2><a href="#/wanted" class="sm">+ new request</a></div>
    ${Wn.length ? `<div class="mlist">${Wn.map(w => { const cnt = w.st === 'active' ? D.listings.filter(l => !isMine('listing', l.id) && wantFits(w, l)).length : 0;
      return `<div class="mi"><div><div class="row" style="gap:12px"><span class="price ${w.p == null ? 'none' : ''}">${w.p == null ? 'price open' : '<span class="upto">up to</span>' + yangHTML(w.p)}</span><span class="st ${w.st}">${statusTxt(w.st)}</span>${w.st === 'active' ? `<span class="dim sm" data-exp="1" data-tc="${w.c}" data-tb="${w.b}" title="Posted ${fmtDate(w.c)}">${timeLabel(w.c, w.b)} · ${left(w.b)}</span>` : `<span class="dim sm">${timeLabel(w.c, w.b)}</span>`}</div>
        <div class="stl">${w.w.map(([id, min]) => `${esc(bName(BY_ID[id]))}${min ? ' <b>' + fmtNum(min) + '+</b>' : ''}`).join(' · ')}</div></div>
        <div class="acts">${cnt ? `<a href="#" data-wgo="${w.id}">${plural(cnt, 'listing')} match</a>` : ''}${w.st !== 'hidden' ? `<button class="lnk" data-wact="bump" data-id="${w.id}">renew</button>` : ''}<button class="lnk bad" data-wact="delete" data-id="${w.id}">delete</button></div></div>`; }).join('')}</div>`
      : `<p class="mut">No wanted requests.</p>`}`;
  bindCommon(el);
  const keyOf = (kind, id) => MINE.find(m => m.kind === kind && m.id === id)?.key;
  const act = async (kind, id, body) => {
    try { await api(`/api/${kind === 'wanted' ? 'wanted' : 'listings'}/${id}`, { key: keyOf(kind, id), ...body }); EDIT = null; await Promise.all([loadMine(), loadMarket(true)]); }
    catch (e) { toast(e.message); }
  };
  $$('[data-act]', el).forEach(b => b.onclick = () => {
    const a = b.dataset.act, id = b.dataset.id;
    if (a === 'sold' || a === 'price') { EDIT = { id, mode: a }; renderMineList(); $('#edv')?.focus(); return; }
    if (a === 'delete' && !confirm('Delete this listing?')) return;
    act('listing', id, { action: a });
  });
  $$('[data-wact]', el).forEach(b => b.onclick = () => {
    if (b.dataset.wact === 'delete' && !confirm('Delete this request?')) return;
    act('wanted', b.dataset.id, { action: b.dataset.wact });
  });
  $$('[data-wgo]', el).forEach(a => a.onclick = e => { e.preventDefault(); goWanted(Wn.find(w => w.id === a.dataset.wgo)); });
  if (EDIT) {
    const save = () => { const v = parseYang($('#edv').value); if (isNaN(v)) { toast('Write the price as a number, e.g. 150kk.'); return; }
      const l = L.find(x => x.id === EDIT.id);
      act('listing', EDIT.id, EDIT.mode === 'sold' ? { action: 'sold', soldPrice: v } : { action: 'edit', price: v, note: l?.t || '', contact: l?.d || '' }); };
    $('#edok').onclick = save; $('#edv').onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { EDIT = null; renderMineList(); } };
    $('#edno').onclick = () => { EDIT = null; renderMineList(); };
  }
}
function renderKeys() {
  const el = $('#mkeys'); if (!el) return;
  const exp = MINE.length ? btoa(unescape(encodeURIComponent(JSON.stringify(MINE)))) : '';
  el.innerHTML = `<h2>Manage from another device</h2>
    <p class="hint" style="margin-top:0">There are no accounts. Your listings can be edited from the browser that posted them, because it keeps a secret key. To manage them on another PC or phone, copy this backup and paste it there.</p>
    <div class="keys">
      <label class="f">Backup</label><textarea readonly id="kexp" placeholder="Nothing to back up yet.">${esc(exp)}</textarea>
      <div class="row" style="margin-top:6px"><button class="btn" id="kcopy" ${exp ? '' : 'disabled'}>Copy backup</button></div>
      <label class="f">Paste a backup from another browser</label><textarea id="kimp"></textarea>
      <div class="row" style="margin-top:6px"><button class="btn" id="kload">Load</button><span class="sm" id="kmsg"></span></div>
    </div>`;
  $('#kcopy').onclick = () => copy(exp, 'Backup copied');
  $('#kload').onclick = async () => {
    try {
      const arr = JSON.parse(decodeURIComponent(escape(atob($('#kimp').value.trim()))));
      let n = 0;
      for (const m of arr) if (m && m.id && m.key && (m.kind === 'listing' || m.kind === 'wanted') && !isMine(m.kind, m.id)) { MINE.push({ kind: m.kind, id: m.id, key: m.key }); n++; }
      saveMine(); $('#kmsg').textContent = `Added ${n}`; renderKeys(); await loadMine();
    } catch { $('#kmsg').textContent = 'That is not a valid backup.'; }
  };
}

// ---------- start ----------
applyTheme();
route();
loadMarket();
loadMine();
setInterval(() => { if (document.visibilityState === 'visible') loadMarket(); }, 60000);
