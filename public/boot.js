// motivy a jejich písma; spouští se v <head> před vykreslením, ať stránka neproblikne
// motivy: jméno, světlý/tmavý režim a písma (načítají se jen pro zvolený motiv)
  window.PAM_THEMES = {
    fantasy:  { name: 'Dark Fantasy', mode: 'dark',  fonts: 'Cinzel:wght@500;600;700&family=Alegreya+Sans:wght@400;500;700' },
    cosmic:   { name: 'Cosmic',       mode: 'dark',  fonts: 'Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700' },
    cyber:    { name: 'Cyberpunk',    mode: 'dark',  fonts: 'Rajdhani:wght@500;600;700&family=Chakra+Petch:wght@400;500;600;700' },
    gothic:   { name: 'Gothic',       mode: 'dark',  fonts: 'Cormorant+SC:wght@500;600;700&family=EB+Garamond:wght@400;500;600;700' },
    coquette: { name: 'Coquette',     mode: 'light', fonts: 'Playfair+Display:ital,wght@0,600;1,500;1,600&family=Quicksand:wght@400;500;600;700' },
    luxury:   { name: 'Luxury',       mode: 'light', fonts: 'Cormorant+Garamond:wght@500;600;700&family=Jost:wght@400;500;600;700' },
    dream:    { name: 'Dreamcore',    mode: 'light', fonts: 'Syne:wght@500;600;700&family=Manrope:wght@400;500;600;700' },
    y2k:      { name: 'Y2K',          mode: 'light', fonts: 'VT323&family=Nunito:wght@400;600;700' }
  };
  // motiv hned při načtení, ať stránka neproblikne
  (function () {
    var t; try { t = JSON.parse(localStorage.getItem('pam:theme') || 'null'); } catch (e) {}
    if (!window.PAM_THEMES[t]) t = 'fantasy';
    var c = window.PAM_THEMES[t], d = document.documentElement;
    d.dataset.theme = t; d.dataset.mode = c.mode;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'themefont';
    l.href = 'https://fonts.googleapis.com/css2?family=' + c.fonts + '&display=swap';
    document.head.appendChild(l);
  })();
