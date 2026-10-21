// ============================================================
//  Pet Artefakt Market – UI
//  Pohledy: #/market (hledání), #/sell (prodej), #/wanted (poptávky), #/mine (moje)
// ============================================================
import { BONUSES, GROUPS, BY_ID, MAX_LINES } from './bonuses.js';
import { readScreenshot, loadImg, makeThumb } from './ocr.js';

// ---------- základ ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('pam:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pam:' + k, JSON.stringify(v)); } catch {} },
};
let LANG = store.get('lang', /^(cs|sk)/i.test(navigator.language || '') ? 'cs' : 'en');
const tr = (cs, en) => LANG === 'en' ? en : cs;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LOC = () => LANG === 'en' ? 'en-US' : 'cs-CZ';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

const fmtNum = v => (Math.round(v * 100) / 100).toLocaleString(LOC());
const fmtV = (b, v) => '+' + fmtNum(v) + (b.unit === '%' ? ' %' : '');
const pct = (b, v) => clamp((v - b.min) / ((b.max - b.min) || 1), 0, 1);
const parseYang = s => {
  const t = String(s ?? '').trim().toLowerCase().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)(k*|m|b|kkk)$/); if (!m) return NaN;
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
  if (s < 90) return tr('právě teď', 'just now');
  if (s < 3600) return tr(`před ${Math.round(s / 60)} min`, `${Math.round(s / 60)} min ago`);
  if (s < 86400) return tr(`před ${Math.round(s / 3600)} h`, `${Math.round(s / 3600)} h ago`);
  const d = Math.round(s / 86400); return tr(`před ${d} ${d === 1 ? 'dnem' : 'dny'}`, `${d} ${d === 1 ? 'day' : 'days'} ago`);
};
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const plural = (n, one, few, many) => n === 1 ? one : n >= 2 && n <= 4 ? few : many;
const nOffers = n => LANG === 'en' ? `${n} ${n === 1 ? 'listing' : 'listings'}` : `${n} ${plural(n, 'nabídka', 'nabídky', 'nabídek')}`;
const nWanted = n => LANG === 'en' ? `${n} ${n === 1 ? 'request' : 'requests'}` : `${n} ${plural(n, 'poptávka', 'poptávky', 'poptávek')}`;
const bName = b => b.s;
const W8 = { 3: 1, 2: 0.55, 1: 0 };

function toast(msg) {
  $('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg || tr('Zkopírováno', 'Copied')); }
  catch { prompt(tr('Zkopíruj si:', 'Copy:'), text); }
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
  } catch (e) { loadErr = tr('Nepodařilo se načíst market. Zkus obnovit stránku.', 'Could not load the market. Try reloading.'); }
  refresh();
}
async function api(path, body, form) {
  const r = await fetch(path, form ? { method: 'POST', body: form } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

// moje věci (klíče k úpravám drží jen prohlížeč)
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

// ---------- shoda ----------
const rowsOf = list => list.filter(r => r.id && BY_ID[r.id]).map(r => ({ id: r.id, min: num(r.min) || 0 }));
function matchListing(l, rows, need) {
  const map = Object.fromEntries(l.s);
  let hits = 0, sp = 0;
  const per = {};
  for (const r of rows) {
    const v = map[r.id];
    const ok = v != null && v >= r.min;
    per[r.id] = v == null ? 'miss' : ok ? 'hit' : 'low';
    if (ok) { hits++; sp += pct(BY_ID[r.id], v); }
  }
  const n = rows.length, nd = need ? Math.min(need, n) : n;
  return { ok: !n || hits >= nd, hits, n, per, q: hits ? sp / hits : 0 };
}
const pvm = l => Math.round(l.s.reduce((a, [id, v]) => a + (W8[BY_ID[id]?.w] || 0) * pct(BY_ID[id], v), 0) / MAX_LINES * 100);
const wantRows = w => w.w.map(([id, min]) => ({ id, min }));
const wantFits = (w, l) => matchListing(l, wantRows(w), w.k).ok;          // staty sedí (cenu řešíme zvlášť)
const overBudget = (w, l) => w.p != null && l.p != null && l.p > w.p;
const budgetTxt = (w, l) => w.p == null ? '' : `<span class="${overBudget(w, l) ? 'bad' : 'dim'}" title="${overBudget(w, l) ? tr('Tvoje cena je nad jeho rozpočtem', 'Your price is above their budget') : ''}">max ${fmtYang(w.p)}</span>`;

// ---------- filtr (market) ----------
const emptyF = () => ({ rows: [{ id: '', min: '' }], need: 0, maxp: '', sort: 'match', img: false });
let F = Object.assign(emptyF(), store.get('filter', {}));
const saveF = () => store.set('filter', F);
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
  const r = (q.get('f') || '').split(',').map(x => x.split(':')).filter(x => BY_ID[x[0]]).map(([id, m]) => ({ id, min: m || '' }));
  if (r.length) f.rows = r;
  f.need = Number(q.get('need')) || 0; f.maxp = q.get('max') || ''; f.sort = q.get('sort') || 'match'; f.img = q.get('img') === '1';
  return f;
}
const describe = f => {
  const r = rowsOf(f.rows);
  if (!r.length) return tr('Všechny artefakty', 'All artifacts');
  return r.map(x => bName(BY_ID[x.id]) + (x.min ? ' ' + fmtNum(x.min) + '+' : '')).join(' · ') + (f.need && f.need < r.length ? ` (${f.need}/${r.length})` : '');
};
function results(f) {
  const rows = rowsOf(f.rows), maxp = parseYang(f.maxp);
  let list = D.listings.map(l => ({ l, m: matchListing(l, rows, f.need), pv: pvm(l) }))
    .filter(x => x.m.ok && (!f.img || x.l.i) && (maxp == null || isNaN(maxp) || x.l.p == null || x.l.p <= maxp));
  const byPrice = (a, b) => (a.l.p ?? Infinity) - (b.l.p ?? Infinity);
  const sorts = {
    match: (a, b) => b.m.hits - a.m.hits || (rows.length ? b.m.q - a.m.q : b.pv - a.pv) || byPrice(a, b),
    price: (a, b) => byPrice(a, b) || b.m.hits - a.m.hits,
    new: (a, b) => b.l.b - a.l.b,
    pvm: (a, b) => b.pv - a.pv || byPrice(a, b),
  };
  list.sort(sorts[f.sort] || sorts.match);
  return list;
}

// hlídaná hledání
let SAVED = store.get('saved', []);            // [{q, seen}]
const saveSaved = () => store.set('saved', SAVED);
const newFor = s => { const f = queryToF(s.q); return results(f).filter(x => x.l.c > s.seen && !isMine('listing', x.l.id)).length; };

// ---------- komponenty ----------
function bonusSelect(cls, i, val, taken) {
  const groups = GROUPS.map(g => `<optgroup label="${esc(tr(g.cs, g.en))}">${BONUSES.filter(b => b.g === g.id)
    .map(b => `<option value="${b.id}" ${b.id === val ? 'selected' : ''} ${taken.has(b.id) && b.id !== val ? 'disabled' : ''}>${esc(bName(b))}</option>`).join('')}</optgroup>`).join('');
  return `<select class="${cls}" data-i="${i}"><option value="">${tr('vyber bonus…', 'pick a bonus…')}</option>${groups}</select>`;
}
const rangeTxt = b => b ? `${fmtNum(b.min)}–${fmtNum(b.max)}${b.unit === '%' ? ' %' : ''}` : '';

function lineHTML(id, v, state) {
  const b = BY_ID[id]; if (!b) return '';
  const p = pct(b, v), atMax = v >= b.max;
  return `<div class="ln ${state || ''}" title="${esc(b.name)} · ${esc(rangeTxt(b))}">
    <span class="nm ${b.c ? 'c-' + b.c : ''}">${esc(bName(b))}</span><span class="vl ${atMax ? 'max' : ''}">${fmtV(b, v)}</span>
    <span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span></div>`;
}
function cardHTML(l, m, opts = {}) {
  const lines = l.s.map(([id, v]) => lineHTML(id, v, m?.per[id] === 'hit' ? 'hit' : m?.per[id] === 'low' ? 'low' : '')).join('');
  const missing = m ? Object.entries(m.per).filter(([, s]) => s === 'miss')
    .map(([id]) => `<div class="ln miss"><span class="nm">${tr('chybí', 'missing')}: ${esc(bName(BY_ID[id]))}</span><span></span></div>`).join('') : '';
  const own = isMine('listing', l.id);
  const priceTxt = l.p == null ? `<span class="price none">${tr('cena dohodou', 'make an offer')}</span>` : `<span class="price">${fmtYang(l.p)}</span>`;
  return `<article class="card ${m && m.n && m.hits < m.n ? 'part' : ''}" data-id="${esc(l.id)}">
    <div class="chead">${priceTxt}${l.r != null ? `<span class="rk">rank ${l.r}</span>` : ''}
      ${m && m.n ? `<span class="match">${tr('shoda', 'match')} ${m.hits}/${m.n}</span>` : `<span class="match dim" title="${tr('Skóre pro PvM: top staty na maximu = 100', 'PvM score: top stats at max = 100')}">PvM ${pvm(l)}</span>`}
      <span class="age">${l.c ? ago(l.b || l.c) : ''}</span></div>
    <div class="lines">${lines}${missing}</div>
    ${l.i && !opts.noImg ? `<img class="thumb" loading="lazy" src="/api/img/${esc(l.id)}" alt="${tr('screenshot artefaktu', 'artifact screenshot')}">` : ''}
    ${opts.thumbUrl ? `<img class="thumb" src="${esc(opts.thumbUrl)}" alt="">` : ''}
    ${l.t ? `<p class="note">${esc(l.t)}</p>` : ''}
    <div class="cfoot"><button class="nick" data-nick="${esc(l.n)}" title="${tr('Zkopírovat nick a napsat mu ve hře', 'Copy the nick and message them in game')}">${esc(l.n || '…')}</button>
      ${l.d ? `<span class="contact">${esc(l.d)}</span>` : ''}<span class="sp"></span>
      ${own ? `<span class="tag">${tr('tvoje', 'yours')}</span>` : opts.preview ? '' : `<button class="lnk mut sm" data-report="listing:${esc(l.id)}">${tr('nahlásit', 'report')}</button>`}</div>
  </article>`;
}
function wantLines(w) {
  return w.w.map(([id, min]) => { const b = BY_ID[id]; return b ? `<div class="ln"><span class="nm">${esc(bName(b))}</span><span class="vl">${min ? '≥ ' + fmtNum(min) + (b.unit === '%' ? ' %' : '') : tr('libovolně', 'any')}</span></div>` : ''; }).join('');
}
function bindCommon(root) {
  $$('[data-nick]', root).forEach(b => b.onclick = () => copy(b.dataset.nick, tr(`Nick ${b.dataset.nick} zkopírován, napiš mu ve hře.`, `Copied ${b.dataset.nick}, message them in game.`)));
  $$('.thumb', root).forEach(i => i.onclick = () => lightbox(i.src));
  $$('[data-report]', root).forEach(b => b.onclick = async () => {
    if (!confirm(tr('Nahlásit jako podvod nebo spam? Po 3 nahlášeních se skryje.', 'Report as scam or spam? It is hidden after 3 reports.'))) return;
    const [kind, id] = b.dataset.report.split(':');
    try { await api(`/api/report/${kind}/${id}`, {}); toast(tr('Díky, nahlášeno.', 'Thanks, reported.')); b.remove(); } catch (e) { toast(e.message); }
  });
}

// ---------- navigace ----------
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
    ['market', 'Market', `<span class="n">${D.listings.length}</span>${savedNew ? `<span class="new" title="${tr('nové v hlídaných hledáních', 'new in watched searches')}">${savedNew}</span>` : ''}`],
    ['sell', tr('Prodat artefakt', 'Sell artifact'), ''],
    ['wanted', tr('Poptávky', 'Wanted'), `<span class="n">${D.wanted.length}</span>`],
    ['mine', tr('Moje', 'Mine'), mb ? `<span class="new">${mb}</span>` : MINE.length ? `<span class="n">${MINE.length}</span>` : ''],
  ];
  $('#nav').innerHTML = items.map(([k, t, x]) => `<a href="#/${k}" class="${VIEW === k ? 'on' : ''}">${t}${x}</a>`).join('');
  $('#hright').innerHTML = `<a href="https://metin.daotech.dev" target="_blank" rel="noopener">Metin Max Rolls</a>
    <span><button class="lang ${LANG === 'cs' ? 'on' : ''}" data-l="cs">CZ</button>/<button class="lang ${LANG === 'en' ? 'on' : ''}" data-l="en">EN</button></span>`;
  $$('.lang').forEach(b => b.onclick = () => { LANG = b.dataset.l; store.set('lang', LANG); document.documentElement.lang = LANG; render(); });
  const tot = savedNew + mb;
  document.title = (tot ? `(${tot}) ` : '') + 'Pet Artefakt Market · Jinteia';
}
function render() {
  renderNav();
  const main = $('#main');
  ({ market: renderMarket, sell: renderSell, wanted: renderWanted, mine: renderMine })[VIEW](main);
}
// po načtení dat přerenderujeme jen části, které nemají rozepsané inputy
function refresh() {
  renderNav();
  if (VIEW === 'market') { renderResults(); renderSaved(); }
  else if (VIEW === 'wanted') renderWantedList();
  else if (VIEW === 'mine') renderMineList();
  else if (VIEW === 'sell') renderSellSide();
}

// ============================================================
//  MARKET
// ============================================================
function renderMarket(main) {
  main.innerHTML = `<div class="view v-market">
    <aside class="side" id="fside"></aside>
    <section class="body" id="results"></section></div>`;
  renderFilter(); renderResults();
}
function renderFilter() {
  const side = $('#fside'); if (!side) return;
  const taken = new Set(F.rows.map(r => r.id).filter(Boolean));
  const n = rowsOf(F.rows).length;
  side.innerHTML = `<h2>${tr('Hledám artefakt', 'Looking for')}</h2>
    <p class="hint" style="margin:-4px 0 12px">${tr('Vyber staty, které chceš, a minimální hodnotu. Prázdné minimum = jakákoliv hodnota.', 'Pick the stats you want and a minimum value. Empty minimum = any value.')}</p>
    <div class="srows">${F.rows.map((r, i) => `<div class="srow">${bonusSelect('fb', i, r.id, taken)}
      <input class="fm" data-i="${i}" type="number" inputmode="decimal" min="0" step="any" placeholder="min" title="${esc(rangeTxt(BY_ID[r.id]))}" value="${esc(r.min)}">
      <button class="x" data-del="${i}" title="${tr('Odebrat', 'Remove')}">×</button></div>
      ${BY_ID[r.id] ? `<div class="hint" style="margin:-3px 0 2px 2px">${tr('rozsah', 'range')} ${rangeTxt(BY_ID[r.id])}</div>` : ''}`).join('')}</div>
    <button class="lnk" id="fadd" style="margin-top:8px" ${F.rows.length >= 7 ? 'disabled' : ''}>+ ${tr('Přidat stat', 'Add stat')}</button>
    <div class="grid2">
      <div><label class="f" for="fneed">${tr('Musí sedět', 'Must match')}</label><select id="fneed">
        <option value="0">${tr('všechny', 'all')}${n ? ` (${n})` : ''}</option>
        ${Array.from({ length: Math.max(0, n - 1) }, (_, k) => `<option value="${k + 1}" ${F.need === k + 1 ? 'selected' : ''}>${tr('aspoň', 'at least')} ${k + 1} ${tr('z', 'of')} ${n}</option>`).join('')}</select></div>
      <div><label class="f" for="fmax">${tr('Max. cena', 'Max price')}</label><input id="fmax" placeholder="${tr('např. 200kk', 'e.g. 200kk')}" value="${esc(F.maxp)}"></div>
    </div>
    <label class="f" for="fsort">${tr('Seřadit', 'Sort by')}</label><select id="fsort">
      ${[['match', tr('nejlepší shoda', 'best match')], ['price', tr('nejnižší cena', 'lowest price')], ['new', tr('nejnovější', 'newest')], ['pvm', tr('PvM skóre', 'PvM score')]]
        .map(([k, t]) => `<option value="${k}" ${F.sort === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <label class="chk"><input type="checkbox" id="fimg" ${F.img ? 'checked' : ''}> ${tr('Jen se screenshotem', 'Only with screenshot')}</label>
    <div class="row wrap" style="margin-top:16px;gap:10px 14px">
      <button class="btn" id="fsave">${tr('Hlídat hledání', 'Watch search')}</button>
      <button class="lnk" id="fshare">${tr('Sdílet odkaz', 'Share link')}</button>
      <button class="lnk" id="fwtb">${tr('Vystavit jako poptávku', 'Post as wanted')}</button>
      <button class="lnk mut" id="fclr">${tr('Vymazat', 'Clear')}</button>
    </div>
    <h3>${tr('Hlídaná hledání', 'Watched searches')}</h3><div class="saved" id="saved"></div>`;

  const changed = (full) => { saveF(); if (full) renderFilter(); renderResults(); };
  $$('.fb', side).forEach(s => s.onchange = () => {
    const r = F.rows[+s.dataset.i]; r.id = s.value; r.min = '';
    if (F.need >= rowsOf(F.rows).length) F.need = 0;
    if (s.value && F.rows.every(x => x.id) && F.rows.length < 7) F.rows.push({ id: '', min: '' });
    changed(true);
    $(`.fm[data-i="${s.dataset.i}"]`)?.focus();
  });
  $$('.fm', side).forEach(x => x.oninput = () => { F.rows[+x.dataset.i].min = x.value; changed(); });
  $$('[data-del]', side).forEach(b => b.onclick = () => { F.rows.splice(+b.dataset.del, 1); if (!F.rows.length) F.rows.push({ id: '', min: '' }); F.need = 0; changed(true); });
  $('#fadd').onclick = () => { F.rows.push({ id: '', min: '' }); changed(true); };
  $('#fneed').onchange = e => { F.need = +e.target.value; changed(); };
  $('#fmax').oninput = e => { F.maxp = e.target.value; e.target.classList.toggle('bad', isNaN(parseYang(e.target.value))); changed(); };
  $('#fsort').onchange = e => { F.sort = e.target.value; changed(); };
  $('#fimg').onchange = e => { F.img = e.target.checked; changed(); };
  $('#fclr').onclick = () => { F = emptyF(); changed(true); };
  $('#fshare').onclick = () => copy(location.origin + location.pathname + '#/market?' + fToQuery(F), tr('Odkaz na hledání zkopírován', 'Search link copied'));
  $('#fsave').onclick = () => {
    const q = fToQuery(F); if (!q) { toast(tr('Nejdřív vyber aspoň jeden stat.', 'Pick at least one stat first.')); return; }
    if (!SAVED.some(s => s.q === q)) { SAVED.unshift({ q, seen: Date.now() }); saveSaved(); }
    toast(tr('Hledání se hlídá. Nové nabídky uvidíš u Marketu.', 'Search watched. New listings show up next to Market.')); renderSaved(); renderNav();
  };
  $('#fwtb').onclick = () => {
    const r = rowsOf(F.rows); if (!r.length) { toast(tr('Nejdřív vyber aspoň jeden stat.', 'Pick at least one stat first.')); return; }
    WF.rows = r.map(x => ({ id: x.id, min: x.min || '' })); WF.need = F.need; WF.maxp = F.maxp; saveWF(); location.hash = '#/wanted';
  };
  renderSaved();
}
function renderSaved() {
  const el = $('#saved'); if (!el) return;
  if (!SAVED.length) { el.innerHTML = `<p class="hint">${tr('Ulož si hledání a uvidíš, když přibude nová nabídka, která sedí.', 'Save a search to see when a new matching listing appears.')}</p>`; return; }
  el.innerHTML = SAVED.map((s, i) => { const f = queryToF(s.q), nw = newFor(s), c = results(f).length;
    return `<div class="sv" data-sv="${i}"><span class="t" title="${esc(describe(f))}">${esc(describe(f))}</span>${nw ? `<span class="new">${nw} ${tr('nové', 'new')}</span>` : `<span class="cnt">${c}</span>`}<button class="x" data-svdel="${i}" title="${tr('Přestat hlídat', 'Stop watching')}">×</button></div>`; }).join('');
  $$('[data-sv]', el).forEach(d => d.onclick = e => {
    if (e.target.closest('[data-svdel]')) return;
    const s = SAVED[+d.dataset.sv]; F = queryToF(s.q); s.seen = Date.now(); saveSaved(); saveF(); renderFilter(); renderResults(); renderNav();
  });
  $$('[data-svdel]', el).forEach(b => b.onclick = () => { SAVED.splice(+b.dataset.svdel, 1); saveSaved(); renderSaved(); renderNav(); });
}
function renderResults() {
  const el = $('#results'); if (!el) return;
  if (!loaded) { el.innerHTML = `<div class="empty">${loadErr || tr('Načítám market…', 'Loading the market…')}</div>`; return; }
  const list = results(F), rows = rowsOf(F.rows);
  const prices = list.map(x => x.l.p).filter(p => p != null);
  const sold = D.sold.filter(s => matchListing(s, rows, F.need).ok && s.p != null).map(s => s.p);
  const head = `<div class="rhead"><h2>${rows.length ? nOffers(list.length) : tr('Všechny nabídky', 'All listings')}</h2>
    ${rows.length ? `<span class="mut sm">${tr('z', 'of')} ${D.listings.length}</span>` : ''}
    ${prices.length ? `<span class="pricebar">${tr('nabízí se od', 'asking from')} <b>${fmtYang(Math.min(...prices))}</b>${prices.length > 2 ? `, ${tr('medián', 'median')} <b>${fmtYang(median(prices))}</b>` : ''}</span>` : ''}
    ${sold.length ? `<span class="pricebar">${tr('prodáno za', 'sold for')} <b>${fmtYang(median(sold))}</b> <span class="dim">(${tr('medián', 'median')}, ${sold.length}×, 45 ${tr('dní', 'days')})</span></span>` : ''}</div>`;
  if (!list.length) {
    el.innerHTML = head + `<div class="empty"><p>${D.listings.length ? tr('Žádná nabídka zatím nesedí.', 'No listing matches yet.') : tr('Market je zatím prázdný.', 'The market is empty so far.')}</p>
      <p>${rows.length ? tr('Zkus povolit „aspoň X z Y“, snížit minimum, <button class="lnk" id="ewatch">hlídat toto hledání</button> nebo <a href="#/wanted" id="ewtb">vystavit poptávku</a>.', 'Try “at least X of Y”, a lower minimum, <button class="lnk" id="ewatch">watch this search</button> or <a href="#/wanted" id="ewtb">post a wanted request</a>.') : `<a href="#/sell">${tr('Vystav první artefakt', 'List the first artifact')}</a>`}</p></div>`;
    $('#ewatch')?.addEventListener('click', () => $('#fsave').click());
    $('#ewtb')?.addEventListener('click', e => { e.preventDefault(); $('#fwtb').click(); });
    return;
  }
  el.innerHTML = head + `<div class="cards">${list.slice(0, 300).map(x => cardHTML(x.l, rows.length ? x.m : null)).join('')}</div>
    ${list.length > 300 ? `<p class="hint">${tr('Zobrazeno prvních 300. Zpřesni hledání.', 'Showing the first 300. Narrow the search.')}</p>` : ''}`;
  bindCommon(el);
}

// ============================================================
//  PRODEJ
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
  el.innerHTML = `<h2>${tr('Prodat artefakt', 'Sell an artifact')}</h2>
    <div class="drop" id="drop" tabindex="0"><span class="big">${tr('Vlož screenshot artefaktu', 'Paste an artifact screenshot')}</span>
      ${tr('Ctrl+V, přetáhni ho sem, nebo <b>klikni a vyber soubor</b>.', 'Ctrl+V, drop it here, or <b>click to choose a file</b>.')}
      <input type="file" id="sfile" accept="image/*" hidden></div>
    <p class="ocrmsg ${SI.cls}">${esc(SI.msg)}</p>
    ${SI.url ? `<div class="shot"><img src="${esc(SI.url)}" alt="" id="shotimg" title="${tr('Tohle uvidí kupující', 'Buyers will see this')}"><p class="hint">${tr('Tenhle výřez uvidí kupující.', 'Buyers will see this crop.')}</p><div class="row" style="gap:16px;margin-top:2px">
      ${SI.full ? `<button class="lnk sm" id="sfull">${tr('použít celý obrázek', 'use the whole image')}</button>` : ''}<button class="lnk mut sm" id="sdel">${tr('odebrat obrázek', 'remove image')}</button></div></div>` : ''}
    ${SI.miss.length ? `<p class="miss">${tr('Tyhle řádky jsem nepoznal, doplň je ručně:', 'Lines I could not read, add them by hand:')} ${SI.miss.map(esc).join(' · ')}</p>` : ''}
    <p class="hint" style="margin-top:14px">${tr('Text se čte přímo u tebe v prohlížeči. Uloží se jen výřez s bonusy, aby kupující viděli, že čísla sedí.', 'The text is read right in your browser. Only the crop with the bonuses is saved, so buyers can see the numbers are real.')}</p>`;
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
  SI.busy = true; SI.msg = tr('Načítám čtečku textu…', 'Loading the text reader…'); SI.cls = ''; SI.miss = []; renderShot();
  try {
    const r = await readScreenshot(file, st => { if (st === 'read') { SI.msg = tr('Čtu bonusy ze screenshotu…', 'Reading the bonuses…'); renderShot(); } });
    SI.full = r.url; SI.blob = r.thumb; SI.url = r.thumb ? URL.createObjectURL(r.thumb) : '';
    SI.miss = r.miss.filter(l => l.length < 80).slice(0, 6);
    if (!r.found.length) {
      SI.msg = tr('Nenašel jsem žádný bonus. Zkus výřez jen s tooltipem, nebo řádky vyplň ručně.', 'No bonus found. Try a crop of just the tooltip, or fill the rows in by hand.'); SI.cls = 'err';
    } else {
      S.rows = Array.from({ length: MAX_LINES }, (_, i) => r.found[i] ? { id: r.found[i].id, v: String(r.found[i].v) } : { id: '', v: '' });
      saveS();
      const n = r.found.length;
      SI.msg = tr(`Našel jsem ${n} ${plural(n, 'bonus', 'bonusy', 'bonusů')}. Zkontroluj, že čísla sedí.`, `Found ${n} ${n === 1 ? 'bonus' : 'bonuses'}. Check that the numbers are right.`); SI.cls = 'ok';
    }
  } catch (e) {
    SI.msg = e.message === 'net' ? tr('Nepodařilo se načíst čtečku textu. Jsi připojený k internetu?', 'Could not load the text reader. Are you online?') : tr('Čtení se nepovedlo, vyplň řádky ručně.', 'Reading failed, fill the rows in by hand.');
    SI.cls = 'err';
  }
  SI.busy = false; renderShot(); renderSellForm(); renderSellSide();
}
function renderSellForm() {
  const el = $('#sform'); if (!el) return;
  const taken = new Set(S.rows.map(r => r.id).filter(Boolean));
  el.innerHTML = `<h2>${tr('Bonusy na artefaktu', 'Bonuses on the artifact')}</h2>
    <div class="srows">${S.rows.map((r, i) => { const b = BY_ID[r.id], v = num(r.v), bad = b && v != null && (v < b.min || v > b.max * 2);
      return `<div class="srow n"><span class="no">${i + 1}.</span>${bonusSelect('sb', i, r.id, taken)}
        <input class="svl ${bad ? 'bad' : ''}" data-i="${i}" type="number" inputmode="decimal" step="any" placeholder="${b ? esc(rangeTxt(b)) : tr('hodnota', 'value')}" value="${esc(r.v)}" ${b ? '' : 'disabled'}>
        <button class="x" data-sdel="${i}" title="${tr('Vymazat řádek', 'Clear row')}" ${r.id ? '' : 'style="visibility:hidden"'}>×</button></div>`; }).join('')}</div>
    <div class="grid2">
      <div><label class="f" for="sprice">${tr('Cena (yang)', 'Price (yang)')}</label><input id="sprice" placeholder="${tr('např. 150kk, prázdné = dohodou', 'e.g. 150kk, empty = offers')}" value="${esc(S.price)}"></div>
      <div><label class="f" for="srank">${tr('Rank artefaktu', 'Artifact rank')} <span class="dim">(${tr('nepovinné', 'optional')})</span></label><input id="srank" type="number" min="0" max="30" value="${esc(S.rank)}"></div>
      <div><label class="f" for="snick">${tr('Tvůj nick ve hře', 'Your in-game nick')}</label><input id="snick" maxlength="24" value="${esc(me.nick)}"></div>
      <div><label class="f" for="scontact">Discord <span class="dim">(${tr('nepovinné', 'optional')})</span></label><input id="scontact" maxlength="40" value="${esc(me.contact)}"></div>
    </div>
    <label class="f" for="snote">${tr('Poznámka', 'Note')} <span class="dim">(${tr('nepovinné', 'optional')})</span></label>
    <textarea id="snote" maxlength="200" placeholder="${tr('např. online večer, CH1, beru i výměnu', 'e.g. online evenings, CH1, open to trades')}">${esc(S.note)}</textarea>
    <p class="err" id="serr">${esc(SI.err)}</p>
    <div class="row"><button class="btn pri" id="ssend">${tr('Vystavit nabídku', 'Post listing')}</button><span class="sp"></span><button class="lnk mut" id="sclr">${tr('Vymazat formulář', 'Clear form')}</button></div>
    <p class="hint">${tr('Nabídka je vidět 14 dní, pak ji jedním klikem obnovíš v sekci Moje.', 'A listing stays up for 14 days, then you can renew it with one click under Mine.')}</p>`;

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
  if (keys.length < 1) return null;
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
    el.innerHTML = `<h2>${tr('Náhled', 'Preview')}</h2><p class="mut">${tr('Vlož screenshot nebo vyplň bonusy a tady uvidíš, jak bude nabídka vypadat, kdo tvůj artefakt shání a za kolik se prodávají podobné.', 'Paste a screenshot or fill in the bonuses to see your listing, who is looking for it, and what similar ones sell for.')}</p>`;
    return;
  }
  const fits = D.wanted.filter(w => !isMine('wanted', w.id) && wantFits(w, l));
  const sim = similar(l);
  el.innerHTML = `<h2>${tr('Náhled', 'Preview')}</h2>
    <div class="preview">${cardHTML(l, null, { preview: true, thumbUrl: SI.url })}</div>
    <h3>${fits.length ? tr(`Tvůj artefakt shání ${fits.length} ${plural(fits.length, 'kupující', 'kupující', 'kupujících')}`, `${fits.length} ${fits.length === 1 ? 'buyer wants' : 'buyers want'} your artifact`) : tr('Poptávky', 'Wanted requests')}</h3>
    ${fits.length ? `<div class="wl">${fits.slice(0, 6).map(w => `<div class="wi"><div class="row"><button class="nick" data-nick="${esc(w.n)}">${esc(w.n)}</button>${w.d ? `<span class="contact">${esc(w.d)}</span>` : ''}<span class="sp"></span>${budgetTxt(w, l)}</div>
      <div class="wst sm">${w.w.map(([id, min]) => `<b>${esc(bName(BY_ID[id]))}</b>${min ? ' ' + fmtNum(min) + '+' : ''}`).join(' · ')}</div></div>`).join('')}</div>
      <p class="hint">${tr('Klikni na nick, zkopíruje se a můžeš mu napsat ve hře.', 'Click a nick to copy it and message them in game.')}</p>`
      : `<p class="mut sm">${tr('Zatím nikdo nepoptává artefakt s těmihle staty.', 'Nobody is asking for these stats yet.')}</p>`}
    ${sim ? `<h3>${tr('Za kolik jdou podobné', 'What similar ones go for')}</h3>
      <p class="mut sm" style="margin:0 0 6px">${tr('Artefakty, které mají taky', 'Artifacts that also have')} ${sim.rows.map(r => esc(bName(BY_ID[r.id]))).join(' + ')}:</p>
      <p class="sm" style="margin:0">${sim.act.length ? `${tr('nabízí se', 'listed')} ${sim.act.length}×, ${tr('od', 'from')} <b>${fmtYang(Math.min(...sim.act))}</b>, ${tr('medián', 'median')} <b>${fmtYang(median(sim.act))}</b>` : tr('Žádný podobný se teď nenabízí.', 'None listed right now.')}</p>
      <p class="sm" style="margin:2px 0 0">${sim.sold.length ? `${tr('prodáno', 'sold')} ${sim.sold.length}× ${tr('za posledních 45 dní, medián', 'in the last 45 days, median')} <b>${fmtYang(median(sim.sold))}</b>` : `<span class="dim">${tr('Zatím žádný prodej v historii.', 'No sales in the history yet.')}</span>`}</p>` : ''}`;
  bindCommon(el);
}
async function submitListing() {
  const btn = $('#ssend'), errEl = $('#serr');
  const stats = sellRows(), p = parseYang(S.price);
  const say = m => { SI.err = m; errEl.textContent = m; };
  if (!stats.length) return say(tr('Vyplň aspoň jeden bonus s hodnotou.', 'Fill in at least one bonus with a value.'));
  const bad = stats.find(([id, v]) => v < BY_ID[id].min || v > BY_ID[id].max * 2);
  if (bad) return say(tr(`Hodnota ${bName(BY_ID[bad[0]])} je mimo rozsah ${rangeTxt(BY_ID[bad[0]])}.`, `${bName(BY_ID[bad[0]])} is outside ${rangeTxt(BY_ID[bad[0]])}.`));
  if (isNaN(p)) return say(tr('Cenu napiš jako číslo, třeba 150kk nebo 1.5kkk.', 'Write the price as a number, e.g. 150kk or 1.5kkk.'));
  if (!/^[\p{L}\p{N}_\-.\[\]]{2,24}$/u.test(me.nick)) return say(tr('Napiš svůj nick ze hry, ať ti kupující můžou napsat.', 'Enter your in-game nick so buyers can message you.'));
  say(''); btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('data', JSON.stringify({ stats, price: p, nick: me.nick, contact: me.contact, note: S.note, rank: S.rank === '' ? null : Number(S.rank) }));
    if (SI.blob) fd.append('img', SI.blob, 'artifact.jpg');
    const r = await api('/api/listings', null, fd);
    MINE.unshift({ kind: 'listing', id: r.id, key: r.key }); saveMine();
    S = emptyS(); saveS(); SI.blob = null; SI.url = ''; SI.full = ''; SI.msg = ''; SI.miss = []; SI.err = '';
    toast(tr('Nabídka je venku.', 'Your listing is live.'));
    await Promise.all([loadMarket(true), loadMine()]);
    location.hash = '#/mine';
  } catch (e) { say(e.message); }
  btn.disabled = false;
}

// ============================================================
//  POPTÁVKY
// ============================================================
const emptyWF = () => ({ rows: [{ id: '', min: '' }], need: 0, maxp: '', note: '' });
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
  const taken = new Set(WF.rows.map(r => r.id).filter(Boolean)), n = rowsOf(WF.rows).length;
  el.innerHTML = `<h2>${tr('Sháním artefakt', 'Wanted: artifact')}</h2>
    <p class="hint" style="margin:-4px 0 12px">${tr('Napiš, jaké staty chceš. Kdo bude vystavovat sedící artefakt, uvidí tvůj nick hned u nabídky.', 'Say which stats you want. Anyone listing a matching artifact sees your nick right away.')}</p>
    <div class="srows">${WF.rows.map((r, i) => `<div class="srow">${bonusSelect('wb', i, r.id, taken)}
      <input class="wm" data-i="${i}" type="number" inputmode="decimal" min="0" step="any" placeholder="min" title="${esc(rangeTxt(BY_ID[r.id]))}" value="${esc(r.min)}">
      <button class="x" data-wdel="${i}">×</button></div>`).join('')}</div>
    <button class="lnk" id="wadd" style="margin-top:8px">+ ${tr('Přidat stat', 'Add stat')}</button>
    <div class="grid2">
      <div><label class="f" for="wneed">${tr('Musí sedět', 'Must match')}</label><select id="wneed"><option value="0">${tr('všechny', 'all')}${n ? ` (${n})` : ''}</option>
        ${Array.from({ length: Math.max(0, n - 1) }, (_, k) => `<option value="${k + 1}" ${WF.need === k + 1 ? 'selected' : ''}>${tr('aspoň', 'at least')} ${k + 1} ${tr('z', 'of')} ${n}</option>`).join('')}</select></div>
      <div><label class="f" for="wmax">${tr('Zaplatím max.', 'Max I pay')}</label><input id="wmax" placeholder="${tr('např. 300kk', 'e.g. 300kk')}" value="${esc(WF.maxp)}"></div>
      <div><label class="f" for="wnick">${tr('Tvůj nick ve hře', 'Your in-game nick')}</label><input id="wnick" maxlength="24" value="${esc(me.nick)}"></div>
      <div><label class="f" for="wcontact">Discord <span class="dim">(${tr('nepovinné', 'optional')})</span></label><input id="wcontact" maxlength="40" value="${esc(me.contact)}"></div>
    </div>
    <label class="f" for="wnote">${tr('Poznámka', 'Note')} <span class="dim">(${tr('nepovinné', 'optional')})</span></label>
    <textarea id="wnote" maxlength="200">${esc(WF.note)}</textarea>
    <p class="err" id="werr"></p>
    <div class="row"><button class="btn pri" id="wsend">${tr('Vystavit poptávku', 'Post wanted')}</button><span class="sp"></span><button class="lnk" id="wsearch">${tr('Hledat v marketu', 'Search the market')}</button></div>`;
  const ch = full => { saveWF(); if (full) renderWantedForm(); };
  $$('.wb', el).forEach(s => s.onchange = () => { const r = WF.rows[+s.dataset.i]; r.id = s.value; r.min = ''; if (s.value && WF.rows.every(x => x.id) && WF.rows.length < 10) WF.rows.push({ id: '', min: '' }); WF.need = 0; ch(true); $(`.wm[data-i="${s.dataset.i}"]`)?.focus(); });
  $$('.wm', el).forEach(x => x.oninput = () => { WF.rows[+x.dataset.i].min = x.value; ch(); });
  $$('[data-wdel]', el).forEach(b => b.onclick = () => { WF.rows.splice(+b.dataset.wdel, 1); if (!WF.rows.length) WF.rows.push({ id: '', min: '' }); WF.need = 0; ch(true); });
  $('#wadd').onclick = () => { WF.rows.push({ id: '', min: '' }); ch(true); };
  $('#wneed').onchange = e => { WF.need = +e.target.value; ch(); };
  $('#wmax').oninput = e => { WF.maxp = e.target.value; ch(); };
  $('#wnote').oninput = e => { WF.note = e.target.value; ch(); };
  $('#wnick').oninput = e => { me.nick = e.target.value.trim(); store.set('me', me); };
  $('#wcontact').oninput = e => { me.contact = e.target.value.trim(); store.set('me', me); };
  $('#wsearch').onclick = () => { F = { ...emptyF(), rows: WF.rows.map(r => ({ ...r })), need: WF.need, maxp: WF.maxp }; saveF(); location.hash = '#/market'; };
  $('#wsend').onclick = async () => {
    const err = $('#werr'), rows = rowsOf(WF.rows), p = parseYang(WF.maxp);
    if (!rows.length) { err.textContent = tr('Vyber aspoň jeden stat.', 'Pick at least one stat.'); return; }
    if (isNaN(p)) { err.textContent = tr('Cenu napiš jako číslo, třeba 300kk.', 'Write the price as a number, e.g. 300kk.'); return; }
    if (!/^[\p{L}\p{N}_\-.\[\]]{2,24}$/u.test(me.nick)) { err.textContent = tr('Napiš svůj nick ze hry.', 'Enter your in-game nick.'); return; }
    err.textContent = ''; $('#wsend').disabled = true;
    try {
      const r = await api('/api/wanted', { want: rows.map(x => [x.id, x.min]), need: WF.need, maxPrice: p, nick: me.nick, contact: me.contact, note: WF.note });
      MINE.unshift({ kind: 'wanted', id: r.id, key: r.key }); saveMine();
      WF = emptyWF(); saveWF(); toast(tr('Poptávka je venku.', 'Your request is live.'));
      await Promise.all([loadMarket(true), loadMine()]); renderWantedForm();
    } catch (e) { err.textContent = e.message; }
    const b = $('#wsend'); if (b) b.disabled = false;
  };
}
function renderWantedList() {
  const el = $('#wlist'); if (!el) return;
  if (!loaded) { el.innerHTML = `<div class="empty">${loadErr || tr('Načítám…', 'Loading…')}</div>`; return; }
  const myL = MINEDATA.listings.filter(l => l.st === 'active');
  let list = D.wanted.map(w => ({ w, fit: myL.filter(l => wantFits(w, l)), cnt: D.listings.filter(l => wantFits(w, l)).length }));
  if (wOnlyMine) list = list.filter(x => x.fit.length);
  el.innerHTML = `<div class="rhead"><h2>${nWanted(D.wanted.length)}</h2>
      ${myL.length ? `<label class="chk" style="margin:0"><input type="checkbox" id="wonly" ${wOnlyMine ? 'checked' : ''}> ${tr('jen ty, kam se hodí můj artefakt', 'only where my artifact fits')}</label>` : ''}</div>
    ${list.length ? `<div class="wcards">${list.map(({ w, fit, cnt }) => `<article class="wcard">
      <div class="chead">${w.p != null ? `<span class="price">${tr('max', 'max')} ${fmtYang(w.p)}</span>` : `<span class="price none">${tr('cena dohodou', 'price open')}</span>`}<span class="age">${ago(w.b)}</span></div>
      <div class="lines">${wantLines(w)}</div>
      ${w.k < w.w.length ? `<span class="mut sm">${tr(`stačí ${w.k} z ${w.w.length}`, `${w.k} of ${w.w.length} is enough`)}</span>` : ''}
      ${w.t ? `<p class="note">${esc(w.t)}</p>` : ''}
      ${fit.length ? `<span class="tag">${tr('hodí se sem tvůj artefakt', 'your artifact fits')} (${fit.length})</span>` : ''}
      <div class="cfoot"><button class="nick" data-nick="${esc(w.n)}">${esc(w.n)}</button>${w.d ? `<span class="contact">${esc(w.d)}</span>` : ''}<span class="sp"></span>
        ${cnt ? `<a href="#" data-wgo="${esc(w.id)}" class="sm">${tr('sedí', 'matches')} ${nOffers(cnt)}</a>` : ''}
        ${isMine('wanted', w.id) ? `<span class="tag">${tr('tvoje', 'yours')}</span>` : `<button class="lnk mut sm" data-report="wanted:${esc(w.id)}">${tr('nahlásit', 'report')}</button>`}</div>
    </article>`).join('')}</div>`
    : `<div class="empty">${wOnlyMine ? tr('Na tvoje artefakty teď nikdo nepoptává.', 'Nobody is asking for your artifacts right now.') : tr('Zatím žádné poptávky. Buď první.', 'No requests yet. Be the first.')}</div>`}`;
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
//  MOJE
// ============================================================
let EDIT = null;   // {id, mode:'sold'|'price'}
function renderMine(main) {
  main.innerHTML = `<div class="view v-mine">
    <section class="body" id="mlist"></section>
    <aside class="side" id="mkeys" style="border-right:0;border-left:1px solid var(--line)"></aside></div>`;
  renderMineList(); renderKeys(); loadMine();
  setTimeout(() => { store.set('mineSeen', Date.now()); }, 1500);
}
const statusTxt = st => ({ active: tr('aktivní', 'active'), sold: tr('prodáno', 'sold'), expired: tr('vypršelo', 'expired'), hidden: tr('skryto po nahlášení', 'hidden after reports') }[st] || st);
function renderMineList() {
  const el = $('#mlist'); if (!el) return;
  const L = MINEDATA.listings, Wn = MINEDATA.wanted;
  const stl = s => s.map(([id, v]) => `${esc(bName(BY_ID[id]))} <b>${fmtV(BY_ID[id], v)}</b>`).join(' · ');
  el.innerHTML = `<div class="rhead"><h2>${tr('Moje nabídky', 'My listings')}</h2><a href="#/sell" class="sm">+ ${tr('nová nabídka', 'new listing')}</a></div>
    ${L.length ? `<div class="mlist">${L.map(l => {
      const fits = l.st === 'active' ? D.wanted.filter(w => !isMine('wanted', w.id) && wantFits(w, l)) : [];
      const ed = EDIT && EDIT.id === l.id ? EDIT.mode : '';
      return `<div class="mi"><div><div class="row" style="gap:12px"><span class="price ${l.p == null ? 'none' : ''}">${l.p == null ? tr('dohodou', 'offers') : fmtYang(l.p)}</span>
          <span class="st ${l.st}">${statusTxt(l.st)}${l.st === 'sold' && l.sp != null ? ' ' + tr('za', 'for') + ' ' + fmtYang(l.sp) : ''}</span><span class="dim sm">${ago(l.b)}</span></div>
          <div class="stl">${stl(l.s)}</div></div>
        <div class="acts">${l.st === 'active' ? `<button class="lnk" data-act="sold" data-id="${l.id}">${tr('prodáno', 'sold')}</button><button class="lnk" data-act="price" data-id="${l.id}">${tr('změnit cenu', 'edit price')}</button>` : ''}
          ${l.st !== 'hidden' ? `<button class="lnk" data-act="bump" data-id="${l.id}">${l.st === 'active' ? tr('obnovit', 'renew') : tr('vystavit znovu', 'relist')}</button>` : ''}
          <button class="lnk bad" data-act="delete" data-id="${l.id}">${tr('smazat', 'delete')}</button></div>
        ${ed ? `<div class="edit"><span class="sm mut">${ed === 'sold' ? tr('Prodáno za', 'Sold for') : tr('Nová cena', 'New price')}</span><input id="edv" value="${esc(yangInput(l.p))}" placeholder="150kk"><button class="btn" id="edok">${tr('Uložit', 'Save')}</button><button class="lnk mut" id="edno">${tr('zrušit', 'cancel')}</button>
          ${ed === 'sold' ? `<span class="hint" style="margin:0">${tr('Cena se ukáže v historii prodejů, pomůže ostatním odhadnout cenu.', 'The price goes into the sales history and helps others price theirs.')}</span>` : ''}</div>` : ''}
        ${fits.length ? `<div class="fits">${tr('Shání ho', 'Wanted by')}: ${fits.slice(0, 8).map(w => `<button class="nick" data-nick="${esc(w.n)}">${esc(w.n)}</button>${w.p != null ? ` (${budgetTxt(w, l)})` : ''}`).join(', ')}</div>` : ''}
      </div>`; }).join('')}</div>` : `<p class="mut">${tr('Zatím tu nic nemáš. Nabídky, které vystavíš z tohohle prohlížeče, se objeví tady.', 'Nothing here yet. Listings you post from this browser show up here.')}</p>`}
    <div class="rhead" style="margin-top:28px"><h2>${tr('Moje poptávky', 'My wanted requests')}</h2><a href="#/wanted" class="sm">+ ${tr('nová poptávka', 'new request')}</a></div>
    ${Wn.length ? `<div class="mlist">${Wn.map(w => { const cnt = w.st === 'active' ? D.listings.filter(l => !isMine('listing', l.id) && wantFits(w, l)).length : 0;
      return `<div class="mi"><div><div class="row" style="gap:12px"><span class="price ${w.p == null ? 'none' : ''}">${w.p == null ? tr('dohodou', 'open') : 'max ' + fmtYang(w.p)}</span><span class="st ${w.st}">${statusTxt(w.st)}</span><span class="dim sm">${ago(w.b)}</span></div>
        <div class="stl">${w.w.map(([id, min]) => `${esc(bName(BY_ID[id]))}${min ? ' <b>' + fmtNum(min) + '+</b>' : ''}`).join(' · ')}</div></div>
        <div class="acts">${cnt ? `<a href="#" data-wgo="${w.id}">${tr('sedí', 'matches')} ${nOffers(cnt)}</a>` : ''}${w.st !== 'hidden' ? `<button class="lnk" data-wact="bump" data-id="${w.id}">${tr('obnovit', 'renew')}</button>` : ''}<button class="lnk bad" data-wact="delete" data-id="${w.id}">${tr('smazat', 'delete')}</button></div></div>`; }).join('')}</div>`
      : `<p class="mut">${tr('Žádné poptávky.', 'No requests.')}</p>`}`;
  bindCommon(el);
  const keyOf = (kind, id) => MINE.find(m => m.kind === kind && m.id === id)?.key;
  const act = async (kind, id, body) => {
    try { await api(`/api/${kind === 'wanted' ? 'wanted' : 'listings'}/${id}`, { key: keyOf(kind, id), ...body }); EDIT = null; await Promise.all([loadMine(), loadMarket(true)]); }
    catch (e) { toast(e.message); }
  };
  $$('[data-act]', el).forEach(b => b.onclick = () => {
    const a = b.dataset.act, id = b.dataset.id;
    if (a === 'sold' || a === 'price') { EDIT = { id, mode: a }; renderMineList(); $('#edv')?.focus(); return; }
    if (a === 'delete' && !confirm(tr('Opravdu smazat nabídku?', 'Really delete this listing?'))) return;
    act('listing', id, { action: a });
  });
  $$('[data-wact]', el).forEach(b => b.onclick = () => {
    if (b.dataset.wact === 'delete' && !confirm(tr('Opravdu smazat poptávku?', 'Really delete this request?'))) return;
    act('wanted', b.dataset.id, { action: b.dataset.wact });
  });
  $$('[data-wgo]', el).forEach(a => a.onclick = e => { e.preventDefault(); goWanted(Wn.find(w => w.id === a.dataset.wgo)); });
  if (EDIT) {
    const save = () => { const v = parseYang($('#edv').value); if (isNaN(v)) { toast(tr('Cenu napiš jako číslo, třeba 150kk.', 'Write the price as a number, e.g. 150kk.')); return; }
      const l = L.find(x => x.id === EDIT.id);
      act('listing', EDIT.id, EDIT.mode === 'sold' ? { action: 'sold', soldPrice: v } : { action: 'edit', price: v, note: l?.t || '', contact: l?.d || '' }); };
    $('#edok').onclick = save; $('#edv').onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { EDIT = null; renderMineList(); } };
    $('#edno').onclick = () => { EDIT = null; renderMineList(); };
  }
}
function renderKeys() {
  const el = $('#mkeys'); if (!el) return;
  const exp = MINE.length ? btoa(unescape(encodeURIComponent(JSON.stringify(MINE)))) : '';
  el.innerHTML = `<h2>${tr('Klíče k úpravám', 'Edit keys')}</h2>
    <p class="hint" style="margin-top:0">${tr('Nabídky nepotřebují účet. Upravovat je jde jen z prohlížeče, ve kterém vznikly, protože si drží tajný klíč. Když chceš spravovat nabídky z jiného PC nebo mobilu, zkopíruj si zálohu a vlož ji tam.', 'No account needed. Listings can only be edited from the browser that created them, since it keeps a secret key. To manage them from another PC or phone, copy this backup and paste it there.')}</p>
    <div class="keys">
      <label class="f">${tr('Záloha', 'Backup')}</label><textarea readonly id="kexp" placeholder="${tr('Zatím nic k zálohování.', 'Nothing to back up yet.')}">${esc(exp)}</textarea>
      <div class="row" style="margin-top:6px"><button class="btn" id="kcopy" ${exp ? '' : 'disabled'}>${tr('Kopírovat zálohu', 'Copy backup')}</button></div>
      <label class="f">${tr('Vložit zálohu z jiného prohlížeče', 'Paste a backup from another browser')}</label><textarea id="kimp"></textarea>
      <div class="row" style="margin-top:6px"><button class="btn" id="kload">${tr('Načíst', 'Load')}</button><span class="sm" id="kmsg"></span></div>
    </div>`;
  $('#kcopy').onclick = () => copy(exp, tr('Záloha zkopírována', 'Backup copied'));
  $('#kload').onclick = async () => {
    try {
      const arr = JSON.parse(decodeURIComponent(escape(atob($('#kimp').value.trim()))));
      let n = 0;
      for (const m of arr) if (m && m.id && m.key && (m.kind === 'listing' || m.kind === 'wanted') && !isMine(m.kind, m.id)) { MINE.push({ kind: m.kind, id: m.id, key: m.key }); n++; }
      saveMine(); $('#kmsg').textContent = tr(`Přidáno: ${n}`, `Added: ${n}`); renderKeys(); await loadMine();
    } catch { $('#kmsg').textContent = tr('Tohle není platná záloha.', 'That is not a valid backup.'); }
  };
}

// ---------- start ----------
document.documentElement.lang = LANG;
route();
loadMarket();
loadMine();
setInterval(() => { if (document.visibilityState === 'visible') loadMarket(); }, 60000);
