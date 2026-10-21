# Pet Artefakt Market

Market s pet artefakty pro Metin2 server **Nihor2 – Chronicles of Jinteia**.
Prodejce vloží screenshot, staty se přečtou samy a nabídka jde ven. Kupující si vybere libovolné staty s minimem a vidí jen to, co sedí.

## Co umí

- **Prodej přes screenshot**: Ctrl+V / přetažení / soubor. Text se čte v prohlížeči (tesseract.js), uloží se jen výřez s bonusy jako důkaz.
- **Hledání podle statů**: libovolný počet statů s minimem, režim „všechny“ nebo „aspoň X z Y“, max. cena, řazení (shoda, cena, nejnovější, PvM skóre), jen se screenshotem.
- **Ceny na trhu**: u každého hledání nejnižší a mediánová cena, plus medián skutečných prodejů za 45 dní.
- **Hlídaná hledání**: uložíš hledání a u Marketu vidíš počet nových nabídek, které sedí.
- **Sdílení hledání odkazem** (`#/market?f=mon:15,sd:5&need=2&max=200kk`).
- **Poptávky (WTB)**: kupující vystaví, co shání. Prodejce při vystavování hned vidí, kdo jeho artefakt chce a za kolik.
- **Moje**: prodáno (s cenou do historie), obnovit, změnit cenu, smazat. Bez účtů, klíč k úpravám drží prohlížeč; jde ho zálohovat a přenést na jiné zařízení.
- Nahlašování (3 nahlášení = skryto), denní limity na IP, nabídka vyprší po 14 dnech.
- CZ / EN.

## Struktura

```
public/          statické soubory (index.html, app.js, ocr.js, bonuses.js, style.css)
src/worker.js    API + servírování public/, databáze D1 (binding DB)
wrangler.jsonc   konfigurace Cloudflare Workers
```

`public/bonuses.js` je jediný zdroj seznamu bonusů a rozsahů. Používá ho UI i worker pro validaci. Pole `id` se ukládá do databáze, takže se nesmí měnit.

## Nasazení na Cloudflare

1. Workers & Pages → Create → Import a repository → `adamdao-tech/pet-artefact`.
2. Build command nech prázdný, deploy command `npx wrangler deploy`.
3. D1 databáze `pet-market` se při prvním deployi vytvoří sama. Kdyby si deploy stěžoval na chybějící `database_id`, vytvoř v D1 databázi `pet-market` a její ID doplň do `wrangler.jsonc`.
4. Tabulky se vytvoří samy při prvním požadavku na API.
5. Volitelně: Settings → Variables and Secrets → secret `ADMIN_KEY`. S hlavičkou `x-admin-key` pak jde mazat cokoliv a `GET /api/admin/reported` ukáže nahlášené.
6. Vlastní doména, např. `pet.daotech.dev`: Settings → Domains & Routes.

## Lokálně

```
npm install
npx wrangler dev
```
