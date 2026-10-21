// ============================================================
//  Čtení screenshotu pet artefaktu (tesseract.js v prohlížeči).
//  Převzato z Metin Max Rolls + výřez tooltipu jako důkaz pro kupující.
// ============================================================
import { BONUSES, MAX_LINES, OVER_MAX } from './bonuses.js';
import { STAT_NAMES, GAME_ALIASES } from './stat-names.js';

const CDN = 'https://cdn.jsdelivr.net/npm/';
const TESS = CDN + 'tesseract.js@5.1.1/dist/tesseract.min.js';
let tessLoading = null;
export function loadTess() {
  if (window.Tesseract) return Promise.resolve();
  if (tessLoading) return tessLoading;
  tessLoading = new Promise((ok, err) => {
    const s = document.createElement('script'); s.src = TESS; s.onload = ok;
    s.integrity = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F'; s.crossOrigin = 'anonymous';   // ověření, že CDN vrátil přesně tenhle soubor
    s.onerror = () => { tessLoading = null; err(new Error('net')); };
    document.head.appendChild(s);
  });
  return tessLoading;
}

const loadImg = src => new Promise((ok, err) => { const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = src; });

function prep(im, thr) {
  const sc = Math.max(2, Math.min(4, 1800 / im.width));
  const cv = document.createElement('canvas'); cv.width = im.width * sc; cv.height = im.height * sc;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(im, 0, 0, cv.width, cv.height);
  const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { const m = Math.max(a[i], a[i + 1], a[i + 2]); const v = m > thr ? 0 : 255; a[i] = a[i + 1] = a[i + 2] = v; }
  g.putImageData(d, 0, 0);
  return { cv, sc };
}

export const norm = t => t.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '');
const bigr = t => { const r = []; for (let i = 0; i < t.length - 1; i++) r.push(t.slice(i, i + 2)); return r; };
const dice = (a, b) => {
  const A = bigr(a), B = bigr(b); if (!A.length || !B.length) return 0;
  const m = new Map(); A.forEach(x => m.set(x, (m.get(x) || 0) + 1));
  let n = 0; B.forEach(x => { const c = m.get(x); if (c) { n++; m.set(x, c - 1); } });
  return 2 * n / (A.length + B.length);
};

// názvy, jak je píše hra (EN/DE/zkrácené) -> id bonusu
const ALIAS = {
  portaldamage: 'portal', portalschaden: 'portal', strongagainstportal: 'portal',
  blitzschaden: 'light', lightningdamage: 'light', feuerschaden: 'burn', brandschaden: 'burn',
  fluchschaden: 'curse', giftschaden: 'poison', magischekraft: 'magic',
  metinschaden: 'metin', stonedamage: 'metin', metindamage: 'metin',
  monsterschaden: 'mon', monsterdamage: 'mon', starkgegenmonster: 'mon',
  durchschnittsschaden: 'avg', averagedamage: 'avg', avg: 'avg',
  fertigkeitsschaden: 'sd', skilldamage: 'sd', sd: 'sd',
  angriffswert: 'att', attackvalue: 'att', angriffsgeschwindigkeit: 'aspd', zaubergeschwindigkeit: 'cast',
  kritischertreffer: 'crit', criticalhit: 'crit', durchbohrendertreffer: 'pierce', piercinghit: 'pierce',
  maxtp: 'hp', maxhp: 'hp', maxmp: 'sp', maxsp: 'sp', itemdrop: 'drop', expbonus: 'exp',
  skillspeed: 'sksp', fertigkeitsgeschwindigkeit: 'sksp', slowingchance: 'slow', verlangsamung: 'slow',
};
const BYID = Object.fromEntries(BONUSES.map(b => [b.id, b]));
// angličtina + názvy z DE/TR/CZ klienta (screenshot z jinak nastavené hry se taky přečte)
const POOL = BONUSES.map(b => ({ b, k: norm(b.name) }))
  .concat(BONUSES.map(b => ({ b, k: norm(b.s) })))
  .concat(Object.entries(ALIAS).map(([k, id]) => ({ b: BYID[id], k })).filter(x => x.b))
  .concat(Object.values(STAT_NAMES).flatMap(m => Object.entries(m).map(([id, n]) => ({ b: BYID[id], k: norm(n.normalize('NFD')) }))))
  .concat(Object.entries(GAME_ALIASES).flatMap(([id, ns]) => ns.map(n => ({ b: BYID[id], k: norm(n.normalize('NFD')) }))))
  .filter(x => x.b && x.k.length >= 3);

function bestBonus(namePart) {
  const words = namePart.replace(/[^A-Za-zÀ-ž%. ]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return { best: null, bs: 0, words };
  let best = null, bs = 0;
  for (let k = 1; k <= Math.min(6, words.length); k++) {       // zkoušíme posledních i prvních k slov (kolem bývá smetí)
    for (const part of [words.slice(-k), words.slice(0, k)]) {
      const w = norm(part.join(' ')); if (w.length < 3) continue;
      for (const n of POOL) { const sc = dice(w, n.k) + (w === n.k ? 0.3 : 0); if (sc > bs) { bs = sc; best = n.b; } }
    }
  }
  return { best, bs, words };
}
const toNum = t => Number(t.replace(/[ .,](?=\d{3}\b)/g, '').replace(',', '.'));

// lines: [{text, bbox?}] -> {found:[{id, v, bbox}], miss:[text]}
// Formáty ve hře: "Skill Speed +5%", "Slowing chance 2%", "Max. HP +2,850", ale i "6 SP gain on hit" (číslo napřed, bez %).
// Nahoře v tooltipu bývá základní stat artefaktu (např. "Magical Power +1%"); když je bonus dvakrát, bereme vyšší hodnotu.
export function parseLines(lines) {
  const found = [], miss = [];
  for (const ln of lines) {
    const line = String(ln.text || '').replace(/[|]/g, ' ').trim();
    let name, num, hasPct, numFirst = false;
    const a = line.match(/^(.*?[A-Za-z].*?)\s*\+?\s*(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d+)?)\s*(%?)/);
    const b = line.match(/^[^A-Za-z\d]*\+?\s*(\d+(?:[.,]\d+)?)\s*(%?)[\s+]*\s([A-Za-z].{2,})$/);
    if (b && !/\d/.test(b[3])) { name = b[3]; num = b[1]; hasPct = b[2] === '%'; numFirst = true; }
    else if (a) { name = a[1]; num = a[2]; hasPct = a[3] === '%'; }
    else continue;
    const { best, bs, words } = bestBonus(name);
    if (best && bs >= 0.62) {
      if (!numFirst && best.unit === '%' && !hasPct && Number(num) <= 3 && best.max > 3) continue;   // základní stat itemu, ne roll
      const v = toNum(num);
      if (!(v >= best.min && v <= best.max * OVER_MAX)) continue;
      const prev = found.find(f => f.id === best.id);
      if (prev) { if (v > prev.v) { prev.v = v; if (ln.bbox) prev.bbox = ln.bbox; } else if (!prev.bbox && ln.bbox && v === prev.v) prev.bbox = ln.bbox; continue; }
      found.push({ id: best.id, v, bbox: ln.bbox || null });
    } else if (hasPct && words.join('').length > 5) miss.push(line.replace(/^[^A-Za-z%\d]+/, ''));
  }
  return { found: found.slice(0, MAX_LINES), miss: [...new Set(miss)] };
}

// Výřez + zmenšení pro uložení (JPEG, < 300 kB)
async function makeThumb(im, box) {
  let sx = 0, sy = 0, sw = im.width, sh = im.height;
  if (box) {
    const padX = Math.max(14, box.w * 0.05), padY = Math.max(4, (box.lh || 14) * 0.45);   // ať nechytíme půlku vedlejšího řádku
    sx = Math.max(0, box.x - padX); sy = Math.max(0, box.y - padY);
    sw = Math.min(im.width - sx, box.w + padX * 2); sh = Math.min(im.height - sy, box.h + padY * 2);
    if (im.width <= 700) { sx = 0; sw = im.width; }       // úzký výřez tooltipu: šířku neořezávat (text je na střed)
  }
  const maxW = box ? 640 : 1000, s = Math.min(1, maxW / sw);
  const cv = document.createElement('canvas'); cv.width = Math.round(sw * s); cv.height = Math.round(sh * s);
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  for (const q of [0.86, 0.75, 0.6, 0.45]) {
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', q));
    if (blob && blob.size < 300 * 1024) return blob;
  }
  return null;
}
export { makeThumb, loadImg };

export async function readScreenshot(file, onMsg = () => {}) {
  const url = URL.createObjectURL(file);
  const im = await loadImg(url);
  onMsg('load');
  await loadTess();
  onMsg('read');
  const w = await Tesseract.createWorker('eng', 1, {
    workerPath: CDN + 'tesseract.js@5.1.1/dist/worker.min.js',
    corePath: CDN + 'tesseract.js-core@5.1.1',
    langPath: CDN + '@tesseract.js-data/eng@1.0.0/4.0.0_best_int',
  });
  const lines = [];
  let scale = 1;
  try {
    for (const thr of [140, 200]) {          // dva průchody: běžný a vyšší práh (světlé UI za tooltipem)
      const { cv, sc } = prep(im, thr); scale = sc;
      const { data } = await w.recognize(cv);
      if (data.lines && data.lines.length) data.lines.forEach(l => lines.push({ text: l.text, bbox: l.bbox }));
      else String(data.text || '').split('\n').forEach(t => lines.push({ text: t }));
    }
  } finally { await w.terminate(); }
  const { found, miss } = parseLines(lines);
  // oblast s nalezenými řádky (v souřadnicích originálu)
  let box = null;
  const bb = found.map(f => f.bbox).filter(Boolean);
  if (bb.length) {
    const x0 = Math.min(...bb.map(b => b.x0)) / scale, y0 = Math.min(...bb.map(b => b.y0)) / scale;
    const x1 = Math.max(...bb.map(b => b.x1)) / scale, y1 = Math.max(...bb.map(b => b.y1)) / scale;
    const lh = bb.reduce((a, b) => a + (b.y1 - b.y0), 0) / bb.length / scale;   // průměrná výška řádku
    box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, lh };
  }
  const thumb = await makeThumb(im, box);
  return { found: found.map(({ id, v }) => ({ id, v })), miss, thumb, url, lines: lines.map(l => l.text) };
}
