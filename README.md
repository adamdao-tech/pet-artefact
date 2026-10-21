# Pet Artefakt Market

Market s pet artefakty pro Metin2 server **Nihor2 – Chronicles of Jinteia**.
Prodejce vloží screenshot, staty se přečtou samy a nabídka jde ven. Kupující si vybere libovolné staty s minimem a vidí jen to, co sedí.

## Co umí

- **Prodej přes screenshot**: Ctrl+V / přetažení / soubor. Text se čte v prohlížeči (tesseract.js), uloží se jen výřez s bonusy jako důkaz.
- **Hledání podle statů**: klikací seznam všech statů (s vyhledáváním), u vybraných volitelné minimum, režim „všechny“ nebo „aspoň X z Y“, max. cena, řazení (shoda, cena, nejnovější, PvM skóre), jen se screenshotem.
- **Ceny na trhu**: u každého hledání nejnižší a mediánová cena, plus medián skutečných prodejů za 45 dní.
- **Hlídaná hledání**: uložíš hledání a u Marketu vidíš počet nových nabídek, které sedí.
- **Sdílení hledání odkazem** (`#/market?f=mon:15,sd:5&need=2&max=200kk`).
- **Poptávky (WTB)**: kupující vystaví, co shání. Prodejce při vystavování hned vidí, kdo jeho artefakt chce a za kolik.
- **Moje**: prodáno (s cenou do historie), obnovit, změnit cenu, smazat. Bez účtů, klíč k úpravám drží prohlížeč; jde ho zálohovat a přenést na jiné zařízení.
- Nahlašování (3 nahlášení = skryto), denní limity na IP, nabídka vyprší po 14 dnech.
- **Jazyky** (vlajky vedle Theme): angličtina (výchozí), Deutsch, Türkçe, čeština. Zdrojové texty v `app.js` jsou anglicky, `public/i18n.js` je po vykreslení přeloží podle slovníku a vzorů s čísly (MutationObserver). Názvy statů, nicky a poznámky se nepřekládají. Nový text v UI = přidat ho do slovníku v `i18n.js`. Vlajky jsou z circle-flags (MIT, `public/icons/flags`).
- **Motivy** (přepínač v hlavičce): Dark Fantasy (výchozí, Metin2), Cosmic, Cyberpunk, Gothic, Coquette, Luxury, Dreamcore, Y2K. Každý má vlastní písma (Google Fonts, načítají se jen pro zvolený motiv), tvar karet, pozadí a jemné animace (`public/fx.js` = canvas částice). Definice motivů jsou v `index.html` (`window.PAM_THEMES`), barvy a detaily v `style.css`. Respektuje `prefers-reduced-motion`.
- **Demo artefakty**: dokud je na marketu méně než 10 skutečných nabídek, přimíchá se 40 demo artefaktů (generované v prohlížeči, nejsou v databázi), aby šlo vyzkoušet hledání. Vypíná se konstantou `DEMO_UNTIL` v `public/app.js`.

## Struktura

```
public/          statické soubory (index.html, app.js, i18n.js, ocr.js, fx.js, bonuses.js, style.css)
src/worker.js    API + servírování public/, databáze D1 (binding DB)
wrangler.jsonc   konfigurace Cloudflare Workers
```

`public/bonuses.js` je jediný zdroj seznamu bonusů a rozsahů. Používá ho UI i worker pro validaci. Pole `id` se ukládá do databáze, takže se nesmí měnit.

## Admin a hlášení chyb

- Každý může vpravo nahoře poslat **Report a bug** (text, volitelný kontakt; stránka, jazyk, motiv a prohlížeč se přidají samy). Limit 6 hlášení na IP a den.
- **Admin** je na `#/admin`. Přihlášení přes Discord, **první, kdo se přihlásí, se stane ownerem**. Owner pak přidává další adminy podle Discord ID (max. 10). Odkaz Admin v menu vidí jen přihlášení admini.
- V adminu: hlášení chyb (open/fixed/smazat), nahlášené nabídky a poptávky (skrýt/obnovit/smazat), seznam adminů, čísla marketu.

### Nastavení Discord přihlášení
1. https://discord.com/developers/applications → New Application (např. „Pet Artifact Market“).
2. OAuth2 → Redirects → přidej `https://petart.daotech.dev/api/auth/callback` (a případně i workers.dev adresu).
3. Zkopíruj Client ID a Client Secret (Reset Secret).
4. Cloudflare → Workers & Pages → pet-artefact → Settings → Variables and Secrets → přidej jako **Secret**: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`. Doporučeno i `IP_SALT` (libovolný náhodný text).
5. Otevři `https://petart.daotech.dev/#/admin` a přihlas se jako první.

## Bezpečnost

- Bezpečnostní hlavičky stránky v `public/_headers` (CSP, zákaz vložení do iframe, nosniff…). Inline skripty nejsou povolené: přepínač motivů je v `public/boot.js`.
- tesseract.js z jsDelivr se načítá s kontrolou SRI (`ocr.js`). Při změně verze je potřeba přepočítat hash.
- Obrázky se kontrolují podle obsahu souboru (JPEG/PNG/WebP), ne podle typu z prohlížeče, a servírují se s `sandbox` CSP.
- Admin session: náhodný token v HttpOnly/Secure/SameSite=Lax cookie, v DB jen jeho hash, 30 dní. Akce adminu kontrolují `Origin` (ochrana proti CSRF). OAuth `state` v cookie.
- Vnitřní chyby se ven nevracejí (jen obecná hláška, detail v logu Workeru).

## Nasazení na Cloudflare

1. Workers & Pages → Create → Import a repository → `adamdao-tech/pet-artefact`.
2. Build command nech prázdný, deploy command `npx wrangler deploy`.
3. D1 databáze `pet-market` se při prvním deployi vytvoří sama. Kdyby si deploy stěžoval na chybějící `database_id`, vytvoř v D1 databázi `pet-market` a její ID doplň do `wrangler.jsonc`.
4. Tabulky se vytvoří samy při prvním požadavku na API.
5. Secrets pro admin viz výše. Volitelně `ADMIN_KEY`: s hlavičkou `x-admin-key` jde volat `/api/admin/*` ze skriptu.
6. Vlastní doména `petart.daotech.dev`: Settings → Domains & Routes.

## Lokálně

```
npm install
npx wrangler dev
```

Pro test Discord přihlášení lokálně jde do `.dev.vars` (není v gitu) nastavit `DISCORD_API` a `DISCORD_AUTHORIZE` na vlastní napodobeninu Discordu.
