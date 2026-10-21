// ============================================================
//  Ambientní pozadí motivů (canvas). Jemné, pomalé, nic víc.
//  fantasy: stoupající jiskry · cosmic: hvězdy + občas padající hvězda
//  coquette: třpytky · gothic: padající lístky/prach · ostatní nic (řeší CSS)
// ============================================================
const CFG = {
  fantasy:  { n: 46, kind: 'ember',   colors: ['#f2a34a', '#f2c66d', '#e0603a', '#b98be8'] },
  cosmic:   { n: 170, kind: 'star',   colors: ['#ffffff', '#c9d4ff', '#f2c8ff', '#9fd0ff'] },
  coquette: { n: 26, kind: 'sparkle', colors: ['#f0b6c8', '#e9c98a', '#d9b8ef', '#ffffff'] },
  gothic:   { n: 22, kind: 'petal',   colors: ['#6e1428', '#8e1f3a', '#4a0f1e', '#9a8a8e'] },
};
let cv, g, parts = [], cfg = null, raf = 0, W = 0, H = 0, dpr = 1, last = 0, shoot = null, nextShoot = 0;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const R = (a, b) => a + Math.random() * (b - a);

function size() {
  dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function spawn(init) {
  const c = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
  switch (cfg.kind) {
    case 'ember': return { x: R(0, W), y: init ? R(0, H) : H + 10, r: R(.7, 2.2), vx: R(-.12, .12), vy: R(-.45, -.15), c, a: R(.3, .85), ph: R(0, 6.28) };
    case 'star': return { x: R(0, W), y: R(0, H), r: R(.3, 1.4), c, a: R(.25, .9), ph: R(0, 6.28), sp: R(.4, 1.6), vx: R(-.015, .015) };
    case 'sparkle': return { x: R(0, W), y: init ? R(0, H) : H + 10, r: R(2, 5), vy: R(-.25, -.08), vx: R(-.05, .05), c, a: R(.3, .8), ph: R(0, 6.28), rot: R(0, 3.14) };
    case 'petal': return { x: R(0, W), y: init ? R(0, H) : -10, r: R(2.5, 5.5), vy: R(.15, .45), vx: R(-.1, .1), c, a: R(.25, .6), ph: R(0, 6.28), rot: R(0, 6.28), vr: R(-.01, .01) };
  }
}
function star4(x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .32 : r; const a = i * Math.PI / 4; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.restore();
}
function frame(t) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(50, t - (last || t)); last = t; const k = dt / 16.7;
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]; p.ph += .02 * k;
    if (cfg.kind === 'ember') {
      p.x += (p.vx + Math.sin(p.ph) * .15) * k; p.y += p.vy * k;
      if (p.y < -10) parts[i] = spawn(false);
      const a = p.a * (.6 + .4 * Math.sin(p.ph * 2));
      g.globalAlpha = a; g.fillStyle = p.c; g.shadowColor = p.c; g.shadowBlur = 8;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    } else if (cfg.kind === 'star') {
      p.x += p.vx * k; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      g.globalAlpha = p.a * (.55 + .45 * Math.sin(p.ph * p.sp)); g.fillStyle = p.c; g.shadowBlur = 0;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    } else if (cfg.kind === 'sparkle') {
      p.x += (p.vx + Math.sin(p.ph) * .1) * k; p.y += p.vy * k; p.rot += .004 * k;
      if (p.y < -10) parts[i] = spawn(false);
      g.globalAlpha = p.a * (.35 + .65 * Math.abs(Math.sin(p.ph))); g.fillStyle = p.c; g.shadowColor = p.c; g.shadowBlur = 6;
      star4(p.x, p.y, p.r, p.rot);
    } else if (cfg.kind === 'petal') {
      p.x += (p.vx + Math.sin(p.ph) * .35) * k; p.y += p.vy * k; p.rot += p.vr * k;
      if (p.y > H + 10) parts[i] = spawn(false);
      g.globalAlpha = p.a; g.fillStyle = p.c; g.shadowBlur = 0;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); g.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.283); g.fill(); g.restore();
    }
  }
  // cosmic: občas padající hvězda
  if (cfg.kind === 'star') {
    if (!shoot && t > nextShoot) { shoot = { x: R(W * .2, W), y: R(0, H * .4), l: 0 }; nextShoot = t + R(7000, 14000); }
    if (shoot) {
      shoot.l += 14 * k; const x = shoot.x - shoot.l, y = shoot.y + shoot.l * .45;
      const grd = g.createLinearGradient(x, y, x + 90, y - 40); grd.addColorStop(0, '#ffffffcc'); grd.addColorStop(1, '#ffffff00');
      g.globalAlpha = Math.max(0, 1 - shoot.l / 700); g.strokeStyle = grd; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 90, y - 40); g.stroke();
      if (shoot.l > 700) shoot = null;
    }
  }
  g.globalAlpha = 1; g.shadowBlur = 0;
}
function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }

export function setFx(theme) {
  if (!cv) {
    cv = document.createElement('canvas'); cv.id = 'fx'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv); g = cv.getContext('2d');
    addEventListener('resize', () => { if (cfg) { size(); parts = Array.from({ length: cfg.n }, () => spawn(true)); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (cfg && !reduce.matches && !raf) raf = requestAnimationFrame(frame); });
  }
  stop(); cfg = CFG[theme] || null; shoot = null;
  if (!cfg) { g.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; return; }
  cv.style.display = ''; size();
  const n = W < 700 ? Math.round(cfg.n / 2) : cfg.n;
  parts = Array.from({ length: n }, () => spawn(true));
  if (reduce.matches) { frame(performance.now()); stop(); return; }   // jen statický snímek
  nextShoot = performance.now() + 4000;
  raf = requestAnimationFrame(frame);
}
