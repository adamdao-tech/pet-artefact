// ============================================================
//  Lokalizace: angličtina je zdroj (texty v app.js zůstávají anglicky),
//  tahle vrstva po vykreslení přeloží texty, placeholdery a tooltipy
//  podle slovníku a vzorů s čísly. Názvy statů, nicky a poznámky se nepřekládají.
// ============================================================
export const LANGS = {
  en: { name: 'English', flag: 'gb', locale: 'en-GB' },
  de: { name: 'Deutsch', flag: 'de', locale: 'de-DE' },
  tr: { name: 'Türkçe', flag: 'tr', locale: 'tr-TR' },
  cs: { name: 'Čeština', flag: 'cz', locale: 'cs-CZ' },
};
let LANG = 'en';
export const getLang = () => LANG;
export const locale = () => LANGS[LANG].locale;

// české tvary: 1 / 2–4 / 5+
const cz = (n, a, b, c) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
const de1 = (n, a, b) => (n === 1 ? a : b);

// ---------- pevné texty ----------
const S = {
  // navigace, hlavička
  'Buy': { de: 'Kaufen', tr: 'Satın al', cs: 'Koupit' },
  'Sell': { de: 'Verkaufen', tr: 'Sat', cs: 'Prodat' },
  'Wanted': { de: 'Gesuche', tr: 'Alım talepleri', cs: 'Poptávky' },
  'My listings': { de: 'Meine Angebote', tr: 'İlanlarım', cs: 'Moje nabídky' },
  'Theme': { de: 'Design', tr: 'Tema', cs: 'Motiv' },
  'Language': { de: 'Sprache', tr: 'Dil', cs: 'Jazyk' },
  'New listings in your favourites': { de: 'Neue Angebote in deinen Favoriten', tr: 'Favorilerinde yeni ilanlar', cs: 'Nové nabídky v oblíbených' },
  '★ welcome to the pet artifact market ★ paste a screenshot to sell ★ search by stats to buy ★ save your favourite stat combos ★ good luck with the rolls ★':
    { de: '★ willkommen auf dem Pet-Artefakt-Markt ★ Screenshot einfügen zum Verkaufen ★ nach Werten suchen zum Kaufen ★ Lieblingskombis speichern ★ viel Glück beim Rollen ★',
      tr: '★ pet artefakt pazarına hoş geldin ★ satmak için ekran görüntüsü yapıştır ★ almak için statlara göre ara ★ favori kombinasyonlarını kaydet ★ bol şans ★',
      cs: '★ vítej na marketu s pet artefakty ★ vlož screenshot a prodávej ★ hledej podle statů a kupuj ★ ulož si oblíbené kombinace ★ hodně štěstí s rolly ★' },

  // levý panel
  'Favourites': { de: 'Favoriten', tr: 'Favoriler', cs: 'Oblíbené' },
  '☆ save current': { de: '☆ aktuelle speichern', tr: '☆ mevcutu kaydet', cs: '☆ uložit aktuální' },
  '★ saved': { de: '★ gespeichert', tr: '★ kaydedildi', cs: '★ uloženo' },
  'Save the stats you picked below': { de: 'Die unten gewählten Werte speichern', tr: 'Aşağıda seçtiğin statları kaydet', cs: 'Uložit staty vybrané níže' },
  'Remove from favourites': { de: 'Aus Favoriten entfernen', tr: 'Favorilerden kaldır', cs: 'Odebrat z oblíbených' },
  'Hunting the same stats often? Pick them below and press “save current”. Then switch with one click, and see when new matches show up.':
    { de: 'Suchst du oft dieselben Werte? Wähle sie unten aus und drücke „aktuelle speichern“. Dann wechselst du mit einem Klick und siehst, wenn neue Treffer auftauchen.',
      tr: 'Sık sık aynı statları mı arıyorsun? Aşağıdan seç ve “mevcutu kaydet”e bas. Sonra tek tıkla geçiş yap ve yeni eşleşmeleri gör.',
      cs: 'Hledáš často stejné staty? Vyber je níže a dej „uložit aktuální“. Pak mezi nimi přepínáš jedním klikem a uvidíš, když přibudou nové shody.' },
  'Search by stats': { de: 'Nach Werten suchen', tr: 'Statlara göre ara', cs: 'Hledat podle statů' },
  'You want': { de: 'Du suchst', tr: 'İstediğin:', cs: 'Chceš' },
  'clear': { de: 'leeren', tr: 'temizle', cs: 'vymazat' },
  'Click a stat to pick it, or type a minimum next to it.': { de: 'Klicke auf einen Wert, um ihn zu wählen, oder gib daneben ein Minimum ein.', tr: 'Seçmek için bir stata tıkla ya da yanına minimum yaz.', cs: 'Klikni na stat a vyber ho, nebo vedle něj napiš minimum.' },
  'Find a stat, e.g. portal': { de: 'Wert suchen, z. B. portal', tr: 'Stat ara, ör. portal', cs: 'Najít stat, např. portal' },
  'min': { de: 'min', tr: 'min', cs: 'min' },
  'any': { de: 'egal', tr: 'hepsi', cs: 'any' },
  'Attack': { de: 'Angriff', tr: 'Saldırı', cs: 'Útok' },
  'Strong against': { de: 'Stark gegen', tr: 'Karşı güçlü', cs: 'Strong against' },
  'Elements & magic': { de: 'Elemente & Magie', tr: 'Elementler & büyü', cs: 'Elementy a magie' },
  'Farm & utility': { de: 'Farmen & Nutzen', tr: 'Farm & yardımcı', cs: 'Farm a utility' },
  'Defense & sustain': { de: 'Verteidigung & Ausdauer', tr: 'Savunma & dayanıklılık', cs: 'Obrana a sustain' },
  'Effect chance': { de: 'Effektchance', tr: 'Efekt şansı', cs: 'Šance na efekt' },

  // toolbar
  'Must have': { de: 'Muss haben', tr: 'Olmalı', cs: 'Musí mít' },
  'all picked stats': { de: 'alle gewählten Werte', tr: 'seçilen tüm statlar', cs: 'všechny vybrané staty' },
  'Max price': { de: 'Max. Preis', tr: 'Maks. fiyat', cs: 'Max. cena' },
  'e.g. 200kk': { de: 'z. B. 200kk', tr: 'ör. 200kk', cs: 'např. 200kk' },
  'Sort': { de: 'Sortieren', tr: 'Sırala', cs: 'Řadit' },
  'best match': { de: 'beste Übereinstimmung', tr: 'en iyi eşleşme', cs: 'nejlepší shoda' },
  'lowest price': { de: 'niedrigster Preis', tr: 'en düşük fiyat', cs: 'nejnižší cena' },
  'newest': { de: 'neueste', tr: 'en yeni', cs: 'nejnovější' },
  'best overall rolls': { de: 'beste Rolls insgesamt', tr: 'genel en iyi rollar', cs: 'nejlepší rolly celkově' },
  'With screenshot': { de: 'Mit Screenshot', tr: 'Ekran görüntülü', cs: 'Se screenshotem' },
  'Copy link': { de: 'Link kopieren', tr: 'Bağlantıyı kopyala', cs: 'Kopírovat odkaz' },
  'Post as wanted': { de: 'Als Gesuch einstellen', tr: 'Alım talebi olarak yayınla', cs: 'Vystavit jako poptávku' },
  'Let sellers know what you are looking for': { de: 'Zeig Verkäufern, was du suchst', tr: 'Satıcılara ne aradığını göster', cs: 'Dej prodejcům vědět, co sháníš' },

  // výsledky
  'asking from': { de: 'angeboten ab', tr: 'en düşük', cs: 'nabízí se od' },
  ', typical': { de: ', üblich', tr: ', ortalama', cs: ', běžně' },
  'yang': { de: 'Yang', tr: 'yang', cs: 'yang' },
  'recently sold for': { de: 'zuletzt verkauft für', tr: 'son satış', cs: 'nedávno prodáno za' },
  'demo listings': { de: 'Demo-Angebote', tr: 'demo ilan', cs: 'demo nabídek' },
  'are mixed in to let you try the search. They go away once 10 real listings are up.': { de: 'beigemischt, damit du die Suche ausprobieren kannst. Sie verschwinden, sobald 10 echte Angebote online sind.', tr: 'aramayı deneyebilmen için eklendi. 10 gerçek ilan olunca kaybolurlar.', cs: 'na vyzkoušení hledání. Zmizí, až bude venku 10 skutečných nabídek.' },
  'Hide demo': { de: 'Demo ausblenden', tr: 'Demoyu gizle', cs: 'Skrýt demo' },
  'Show demo listings': { de: 'Demo-Angebote anzeigen', tr: 'Demo ilanları göster', cs: 'Ukázat demo nabídky' },
  'Nothing matches yet.': { de: 'Noch kein Treffer.', tr: 'Henüz eşleşme yok.', cs: 'Zatím nic nesedí.' },
  'The market is empty so far.': { de: 'Der Markt ist noch leer.', tr: 'Pazar henüz boş.', cs: 'Market je zatím prázdný.' },
  'List the first artifact': { de: 'Das erste Artefakt einstellen', tr: 'İlk artefaktı listele', cs: 'Vystav první artefakt' },
  'Lower the minimum,': { de: 'Senke das Minimum,', tr: 'Minimumu düşür,', cs: 'Sniž minimum,' },
  'save it to favourites to spot new matches, or': { de: 'speichere es in den Favoriten, um neue Treffer zu sehen, oder', tr: 'yeni eşleşmeleri görmek için favorilere kaydet ya da', cs: 'ulož si to do oblíbených a uvidíš nové shody, nebo' },
  'Lower the minimum, save it to favourites to spot new matches, or': { de: 'Senke das Minimum, speichere es in den Favoriten, um neue Treffer zu sehen, oder', tr: 'Minimumu düşür, yeni eşleşmeler için favorilere kaydet ya da', cs: 'Sniž minimum, ulož si to do oblíbených a uvidíš nové shody, nebo' },
  'post it as wanted': { de: 'stelle es als Gesuch ein', tr: 'alım talebi olarak yayınla', cs: 'vystav poptávku' },
  'so sellers find you.': { de: ', damit Verkäufer dich finden.', tr: ', böylece satıcılar seni bulur.', cs: ', ať tě prodejci najdou.' },
  'Showing the first 300. Narrow the search.': { de: 'Die ersten 300 werden angezeigt. Grenze die Suche ein.', tr: 'İlk 300 gösteriliyor. Aramayı daralt.', cs: 'Zobrazeno prvních 300. Zpřesni hledání.' },
  'Loading the market…': { de: 'Markt wird geladen…', tr: 'Pazar yükleniyor…', cs: 'Načítám market…' },
  'Loading…': { de: 'Lädt…', tr: 'Yükleniyor…', cs: 'Načítám…' },
  'Could not load the market. Try reloading the page.': { de: 'Der Markt konnte nicht geladen werden. Lade die Seite neu.', tr: 'Pazar yüklenemedi. Sayfayı yenilemeyi dene.', cs: 'Market se nepodařilo načíst. Zkus obnovit stránku.' },

  // karta
  'Make an offer': { de: 'Preis verhandelbar', tr: 'Teklif ver', cs: 'Cena dohodou' },
  'demo': { de: 'Demo', tr: 'demo', cs: 'demo' },
  'Has the stat you want': { de: 'Hat den gesuchten Wert', tr: 'İstediğin stat var', cs: 'Má hledaný stat' },
  'not on it': { de: 'nicht vorhanden', tr: 'yok', cs: 'nemá' },
  'Other bonuses': { de: 'Weitere Boni', tr: 'Diğer bonuslar', cs: 'Ostatní bonusy' },
  'max': { de: 'max', tr: 'maks', cs: 'max' },
  'no screenshot': { de: 'kein Screenshot', tr: 'ekran görüntüsü yok', cs: 'bez screenshotu' },
  'demo, no screenshot': { de: 'Demo, kein Screenshot', tr: 'demo, ekran görüntüsü yok', cs: 'demo, bez screenshotu' },
  'Click to enlarge': { de: 'Zum Vergrößern klicken', tr: 'Büyütmek için tıkla', cs: 'Klikni pro zvětšení' },
  'Demo listing, not a real seller': { de: 'Demo-Angebot, kein echter Verkäufer', tr: 'Demo ilan, gerçek satıcı değil', cs: 'Demo nabídka, ne skutečný prodejce' },
  'Seller': { de: 'Verkäufer', tr: 'Satıcı', cs: 'Prodejce' },
  'Buyer': { de: 'Käufer', tr: 'Alıcı', cs: 'Kupující' },
  'Whisper them in game': { de: 'Im Spiel anflüstern', tr: 'Oyunda fısılda', cs: 'Napiš mu ve hře' },
  'Contact': { de: 'Kontakt', tr: 'İletişim', cs: 'Kontakt' },
  'report': { de: 'melden', tr: 'şikayet et', cs: 'nahlásit' },
  'yours': { de: 'deins', tr: 'senin', cs: 'tvoje' },
  'up to': { de: 'bis', tr: 'en fazla', cs: 'až' },
  'Price open': { de: 'Preis offen', tr: 'Fiyat açık', cs: 'Cena otevřená' },
  'price open': { de: 'Preis offen', tr: 'fiyat açık', cs: 'cena otevřená' },
  'offers': { de: 'verhandelbar', tr: 'teklif', cs: 'dohodou' },
  'expired': { de: 'abgelaufen', tr: 'süresi doldu', cs: 'vypršelo' },

  // kontaktní okno
  'Close': { de: 'Schließen', tr: 'Kapat', cs: 'Zavřít' },
  'Whisper the seller in game: press': { de: 'Flüstere den Verkäufer im Spiel an: drücke', tr: 'Satıcıya oyunda fısılda: bas', cs: 'Napiš prodejci ve hře: zmáčkni' },
  'Whisper the buyer in game: press': { de: 'Flüstere den Käufer im Spiel an: drücke', tr: 'Alıcıya oyunda fısılda: bas', cs: 'Napiš kupujícímu ve hře: zmáčkni' },
  ', paste the nick into the first field and the message into the second.': { de: ', füge den Nick ins erste Feld und die Nachricht ins zweite ein.', tr: ', nicki ilk alana, mesajı ikinci alana yapıştır.', cs: ', do prvního pole vlož nick a do druhého zprávu.' },
  'In-game nick': { de: 'Nick im Spiel', tr: 'Oyun içi nick', cs: 'Nick ve hře' },
  'Copy nick': { de: 'Nick kopieren', tr: 'Nicki kopyala', cs: 'Kopírovat nick' },
  'Message': { de: 'Nachricht', tr: 'Mesaj', cs: 'Zpráva' },
  '(you can edit it)': { de: '(kannst du bearbeiten)', tr: '(düzenleyebilirsin)', cs: '(můžeš ji upravit)' },
  'Copy message': { de: 'Nachricht kopieren', tr: 'Mesajı kopyala', cs: 'Kopírovat zprávu' },
  'Or on Discord': { de: 'Oder auf Discord', tr: 'Ya da Discord’da', cs: 'Nebo na Discordu' },
  'Copy Discord name': { de: 'Discord-Namen kopieren', tr: 'Discord adını kopyala', cs: 'Kopírovat Discord' },
  'Copied ✓': { de: 'Kopiert ✓', tr: 'Kopyalandı ✓', cs: 'Zkopírováno ✓' },
  'Copied': { de: 'Kopiert', tr: 'Kopyalandı', cs: 'Zkopírováno' },
  'Copied the message': { de: 'Nachricht kopiert', tr: 'Mesaj kopyalandı', cs: 'Zpráva zkopírována' },
  'Copied Discord name': { de: 'Discord-Name kopiert', tr: 'Discord adı kopyalandı', cs: 'Discord zkopírován' },
  'Search link copied': { de: 'Suchlink kopiert', tr: 'Arama bağlantısı kopyalandı', cs: 'Odkaz na hledání zkopírován' },
  'Copy this:': { de: 'Kopiere das:', tr: 'Bunu kopyala:', cs: 'Zkopíruj si:' },
  'Pick at least one stat first.': { de: 'Wähle zuerst mindestens einen Wert.', tr: 'Önce en az bir stat seç.', cs: 'Nejdřív vyber aspoň jeden stat.' },
  'Thanks, reported.': { de: 'Danke, gemeldet.', tr: 'Teşekkürler, bildirildi.', cs: 'Díky, nahlášeno.' },
  'Report this as a scam or spam? It gets hidden after 3 reports.': { de: 'Als Betrug oder Spam melden? Nach 3 Meldungen wird es ausgeblendet.', tr: 'Dolandırıcılık veya spam olarak bildirilsin mi? 3 bildirimden sonra gizlenir.', cs: 'Nahlásit jako podvod nebo spam? Po 3 nahlášeních se skryje.' },

  // prodej
  '1. Screenshot': { de: '1. Screenshot', tr: '1. Ekran görüntüsü', cs: '1. Screenshot' },
  'Paste your artifact screenshot': { de: 'Füge deinen Artefakt-Screenshot ein', tr: 'Artefakt ekran görüntünü yapıştır', cs: 'Vlož screenshot artefaktu' },
  'Press Ctrl+V, drop the image here, or': { de: 'Drücke Strg+V, zieh das Bild hierher oder', tr: 'Ctrl+V’ye bas, görseli buraya sürükle ya da', cs: 'Zmáčkni Ctrl+V, přetáhni sem obrázek, nebo' },
  'click to pick a file': { de: 'klicke, um eine Datei zu wählen', tr: 'dosya seçmek için tıkla', cs: 'klikni a vyber soubor' },
  'Tip: hover the artifact in game, press Win+Shift+S, cut out the tooltip and paste it here. The text is read in your browser.': { de: 'Tipp: Fahre im Spiel über das Artefakt, drücke Win+Umschalt+S, schneide den Tooltip aus und füge ihn hier ein. Der Text wird in deinem Browser gelesen.', tr: 'İpucu: oyunda artefaktın üzerine gel, Win+Shift+S’ye bas, açıklama penceresini kes ve buraya yapıştır. Metin tarayıcında okunur.', cs: 'Tip: ve hře najeď na artefakt, dej Win+Shift+S, vyřízni tooltip a vlož ho sem. Text se čte přímo v prohlížeči.' },
  'Buyers see this crop, so they know the numbers are real.': { de: 'Käufer sehen diesen Ausschnitt und wissen so, dass die Zahlen echt sind.', tr: 'Alıcılar bu kesiti görür, böylece rakamların gerçek olduğunu bilirler.', cs: 'Tenhle výřez uvidí kupující, ať vědí, že čísla sedí.' },
  'Buyers will see this': { de: 'Das sehen Käufer', tr: 'Alıcılar bunu görecek', cs: 'Tohle uvidí kupující' },
  'use the whole image': { de: 'ganzes Bild verwenden', tr: 'tüm görseli kullan', cs: 'použít celý obrázek' },
  'remove image': { de: 'Bild entfernen', tr: 'görseli kaldır', cs: 'odebrat obrázek' },
  'Could not read these lines, add them by hand:': { de: 'Diese Zeilen konnten nicht gelesen werden, trag sie von Hand ein:', tr: 'Bu satırlar okunamadı, elle ekle:', cs: 'Tyhle řádky jsem nepřečetl, doplň je ručně:' },
  'Loading the text reader…': { de: 'Texterkennung wird geladen…', tr: 'Metin okuyucu yükleniyor…', cs: 'Načítám čtečku textu…' },
  'Reading the bonuses…': { de: 'Boni werden gelesen…', tr: 'Bonuslar okunuyor…', cs: 'Čtu bonusy…' },
  'No bonus found. Try a tighter crop of just the tooltip, or fill in the rows by hand.': { de: 'Kein Bonus gefunden. Versuch einen engeren Ausschnitt nur mit dem Tooltip oder trag die Zeilen von Hand ein.', tr: 'Bonus bulunamadı. Sadece açıklama penceresini kesmeyi dene ya da satırları elle doldur.', cs: 'Nenašel jsem žádný bonus. Zkus užší výřez jen s tooltipem, nebo řádky vyplň ručně.' },
  'Could not load the text reader. Are you online?': { de: 'Texterkennung konnte nicht geladen werden. Bist du online?', tr: 'Metin okuyucu yüklenemedi. İnternete bağlı mısın?', cs: 'Čtečku textu se nepodařilo načíst. Jsi online?' },
  'Reading failed. Fill in the rows by hand.': { de: 'Lesen fehlgeschlagen. Trag die Zeilen von Hand ein.', tr: 'Okuma başarısız. Satırları elle doldur.', cs: 'Čtení se nepovedlo. Vyplň řádky ručně.' },
  '2. Check the bonuses': { de: '2. Boni prüfen', tr: '2. Bonusları kontrol et', cs: '2. Zkontroluj bonusy' },
  'pick a bonus…': { de: 'Bonus wählen…', tr: 'bonus seç…', cs: 'vyber bonus…' },
  'value': { de: 'Wert', tr: 'değer', cs: 'hodnota' },
  'Clear row': { de: 'Zeile leeren', tr: 'Satırı temizle', cs: 'Vymazat řádek' },
  '3. Price and contact': { de: '3. Preis und Kontakt', tr: '3. Fiyat ve iletişim', cs: '3. Cena a kontakt' },
  'Price in yang': { de: 'Preis in Yang', tr: 'Yang olarak fiyat', cs: 'Cena v yangu' },
  'e.g. 150kk, empty = offers': { de: 'z. B. 150kk, leer = verhandelbar', tr: 'ör. 150kk, boş = teklif', cs: 'např. 150kk, prázdné = dohodou' },
  'Artifact rank': { de: 'Artefakt-Rang', tr: 'Artefakt rütbesi', cs: 'Rank artefaktu' },
  '(optional)': { de: '(optional)', tr: '(isteğe bağlı)', cs: '(nepovinné)' },
  'Your in-game nick': { de: 'Dein Nick im Spiel', tr: 'Oyun içi nickin', cs: 'Tvůj nick ve hře' },
  'Note': { de: 'Notiz', tr: 'Not', cs: 'Poznámka' },
  'e.g. online evenings, CH1, open to trades': { de: 'z. B. abends online, CH1, offen für Tausch', tr: 'ör. akşamları çevrimiçi, CH1, takasa açık', cs: 'např. online večer, CH1, beru i výměnu' },
  'Post listing': { de: 'Angebot einstellen', tr: 'İlanı yayınla', cs: 'Vystavit nabídku' },
  'Clear form': { de: 'Formular leeren', tr: 'Formu temizle', cs: 'Vymazat formulář' },
  'Listings stay up for 14 days. Renew them with one click under My listings.': { de: 'Angebote bleiben 14 Tage online. Unter „Meine Angebote“ verlängerst du sie mit einem Klick.', tr: 'İlanlar 14 gün yayında kalır. İlanlarım bölümünden tek tıkla yenile.', cs: 'Nabídky vydrží 14 dní. V Moje nabídky je jedním klikem obnovíš.' },
  'Preview': { de: 'Vorschau', tr: 'Önizleme', cs: 'Náhled' },
  'Paste a screenshot or fill in the bonuses. Here you will see your listing, who is looking for it, and what similar artifacts go for.': { de: 'Füge einen Screenshot ein oder trag die Boni ein. Hier siehst du dein Angebot, wer danach sucht und was ähnliche Artefakte kosten.', tr: 'Ekran görüntüsü yapıştır ya da bonusları doldur. Burada ilanını, onu kimin aradığını ve benzer artefaktların fiyatını göreceksin.', cs: 'Vlož screenshot nebo vyplň bonusy. Tady uvidíš svou nabídku, kdo ji shání a za kolik jdou podobné artefakty.' },
  'Buyers looking for this': { de: 'Käufer, die das suchen', tr: 'Bunu arayan alıcılar', cs: 'Kdo to shání' },
  'Nobody has posted a wanted request for these stats yet.': { de: 'Noch niemand sucht nach diesen Werten.', tr: 'Bu statlar için henüz alım talebi yok.', cs: 'Na tyhle staty zatím nikdo nemá poptávku.' },
  'Click a nick to copy it and whisper them in game.': { de: 'Klicke auf einen Nick, um ihn zu kopieren und im Spiel anzuflüstern.', tr: 'Nicki kopyalamak ve oyunda fısıldamak için tıkla.', cs: 'Klikni na nick, zkopíruje se a můžeš mu napsat ve hře.' },
  'What similar artifacts go for': { de: 'Was ähnliche Artefakte kosten', tr: 'Benzer artefaktların fiyatı', cs: 'Za kolik jdou podobné' },
  'None listed right now.': { de: 'Gerade keines im Angebot.', tr: 'Şu anda ilan yok.', cs: 'Teď se žádný nenabízí.' },
  'No sales recorded yet.': { de: 'Noch keine Verkäufe erfasst.', tr: 'Henüz kayıtlı satış yok.', cs: 'Zatím žádný prodej v historii.' },
  'Fill in at least one bonus with a value.': { de: 'Trag mindestens einen Bonus mit Wert ein.', tr: 'En az bir bonusu değeriyle doldur.', cs: 'Vyplň aspoň jeden bonus s hodnotou.' },
  'Write the price as a number, e.g. 150kk or 1.5kkk.': { de: 'Gib den Preis als Zahl an, z. B. 150kk oder 1.5kkk.', tr: 'Fiyatı sayı olarak yaz, ör. 150kk veya 1.5kkk.', cs: 'Cenu napiš jako číslo, třeba 150kk nebo 1.5kkk.' },
  'Write the price as a number, e.g. 150kk.': { de: 'Gib den Preis als Zahl an, z. B. 150kk.', tr: 'Fiyatı sayı olarak yaz, ör. 150kk.', cs: 'Cenu napiš jako číslo, třeba 150kk.' },
  'Write the price as a number, e.g. 300kk.': { de: 'Gib den Preis als Zahl an, z. B. 300kk.', tr: 'Fiyatı sayı olarak yaz, ör. 300kk.', cs: 'Cenu napiš jako číslo, třeba 300kk.' },
  'Enter your in-game nick so buyers can whisper you.': { de: 'Gib deinen Nick im Spiel an, damit Käufer dich anflüstern können.', tr: 'Alıcıların sana fısıldayabilmesi için oyun içi nickini yaz.', cs: 'Napiš svůj nick ze hry, ať ti kupující můžou napsat.' },
  'Enter your in-game nick.': { de: 'Gib deinen Nick im Spiel an.', tr: 'Oyun içi nickini yaz.', cs: 'Napiš svůj nick ze hry.' },
  'Your listing is live.': { de: 'Dein Angebot ist online.', tr: 'İlanın yayında.', cs: 'Nabídka je venku.' },

  // poptávky
  'Post a wanted request': { de: 'Gesuch einstellen', tr: 'Alım talebi yayınla', cs: 'Vystavit poptávku' },
  'Say which stats you want. Anyone who lists a matching artifact sees your nick right away.': { de: 'Sag, welche Werte du willst. Wer ein passendes Artefakt einstellt, sieht sofort deinen Nick.', tr: 'Hangi statları istediğini söyle. Uygun artefakt listeleyen herkes nickini hemen görür.', cs: 'Napiš, jaké staty chceš. Kdo vystaví sedící artefakt, hned uvidí tvůj nick.' },
  'I pay up to': { de: 'Ich zahle bis', tr: 'En fazla öderim', cs: 'Zaplatím až' },
  'e.g. 300kk': { de: 'z. B. 300kk', tr: 'ör. 300kk', cs: 'např. 300kk' },
  'Post request': { de: 'Gesuch einstellen', tr: 'Talebi yayınla', cs: 'Vystavit poptávku' },
  'Search the market first': { de: 'Erst den Markt durchsuchen', tr: 'Önce pazarda ara', cs: 'Nejdřív hledat v marketu' },
  'Pick at least one stat.': { de: 'Wähle mindestens einen Wert.', tr: 'En az bir stat seç.', cs: 'Vyber aspoň jeden stat.' },
  'Your request is live.': { de: 'Dein Gesuch ist online.', tr: 'Talebin yayında.', cs: 'Poptávka je venku.' },
  'only where my artifact fits': { de: 'nur wo mein Artefakt passt', tr: 'sadece artefaktımın uyduğu', cs: 'jen kam se hodí můj artefakt' },
  'no listing matches yet': { de: 'noch kein passendes Angebot', tr: 'henüz eşleşen ilan yok', cs: 'zatím nesedí žádná nabídka' },
  'No wanted requests yet. Be the first.': { de: 'Noch keine Gesuche. Sei der Erste.', tr: 'Henüz alım talebi yok. İlk sen ol.', cs: 'Zatím žádné poptávky. Buď první.' },
  'Nobody is asking for your artifacts right now.': { de: 'Gerade sucht niemand nach deinen Artefakten.', tr: 'Şu anda artefaktlarını arayan yok.', cs: 'Na tvoje artefakty teď nikdo nemá poptávku.' },

  // moje
  '+ sell another': { de: '+ noch eins verkaufen', tr: '+ bir tane daha sat', cs: '+ prodat další' },
  '+ new request': { de: '+ neues Gesuch', tr: '+ yeni talep', cs: '+ nová poptávka' },
  'Nothing here yet. Listings you post from this browser show up here.': { de: 'Noch nichts hier. Angebote, die du in diesem Browser einstellst, erscheinen hier.', tr: 'Henüz bir şey yok. Bu tarayıcıdan yayınladığın ilanlar burada görünür.', cs: 'Zatím tu nic není. Nabídky vystavené z tohohle prohlížeče se objeví tady.' },
  'My wanted requests': { de: 'Meine Gesuche', tr: 'Alım taleplerim', cs: 'Moje poptávky' },
  'No wanted requests.': { de: 'Keine Gesuche.', tr: 'Alım talebi yok.', cs: 'Žádné poptávky.' },
  'live': { de: 'online', tr: 'yayında', cs: 'venku' },
  'sold': { de: 'verkauft', tr: 'satıldı', cs: 'prodáno' },
  'hidden after reports': { de: 'nach Meldungen ausgeblendet', tr: 'şikayetler sonrası gizlendi', cs: 'skryto po nahlášení' },
  'mark sold': { de: 'als verkauft markieren', tr: 'satıldı işaretle', cs: 'prodáno' },
  'price': { de: 'Preis', tr: 'fiyat', cs: 'cena' },
  'renew': { de: 'verlängern', tr: 'yenile', cs: 'obnovit' },
  'list again': { de: 'erneut einstellen', tr: 'tekrar listele', cs: 'vystavit znovu' },
  'delete': { de: 'löschen', tr: 'sil', cs: 'smazat' },
  'Sold for': { de: 'Verkauft für', tr: 'Satış fiyatı', cs: 'Prodáno za' },
  'New price': { de: 'Neuer Preis', tr: 'Yeni fiyat', cs: 'Nová cena' },
  'Save': { de: 'Speichern', tr: 'Kaydet', cs: 'Uložit' },
  'cancel': { de: 'abbrechen', tr: 'iptal', cs: 'zrušit' },
  'Wanted by': { de: 'Gesucht von', tr: 'Arayan', cs: 'Shání ho' },
  'Delete this listing?': { de: 'Dieses Angebot löschen?', tr: 'Bu ilan silinsin mi?', cs: 'Smazat tuhle nabídku?' },
  'Delete this request?': { de: 'Dieses Gesuch löschen?', tr: 'Bu talep silinsin mi?', cs: 'Smazat tuhle poptávku?' },
  'Manage from another device': { de: 'Von einem anderen Gerät verwalten', tr: 'Başka bir cihazdan yönet', cs: 'Správa z jiného zařízení' },
  'There are no accounts. Your listings can be edited from the browser that posted them, because it keeps a secret key. To manage them on another PC or phone, copy this backup and paste it there.': { de: 'Es gibt keine Konten. Deine Angebote lassen sich in dem Browser bearbeiten, in dem du sie eingestellt hast, weil er einen geheimen Schlüssel speichert. Um sie auf einem anderen PC oder Handy zu verwalten, kopiere diese Sicherung und füge sie dort ein.', tr: 'Hesap yok. İlanlarını, onları yayınladığın tarayıcıdan düzenleyebilirsin; çünkü gizli bir anahtar saklar. Başka bir PC veya telefonda yönetmek için bu yedeği kopyala ve orada yapıştır.', cs: 'Účty tu nejsou. Nabídky jde upravovat z prohlížeče, ve kterém vznikly, protože si drží tajný klíč. Pro správu z jiného PC nebo mobilu zkopíruj tuhle zálohu a vlož ji tam.' },
  'Backup': { de: 'Sicherung', tr: 'Yedek', cs: 'Záloha' },
  'Nothing to back up yet.': { de: 'Noch nichts zu sichern.', tr: 'Henüz yedeklenecek bir şey yok.', cs: 'Zatím není co zálohovat.' },
  'Copy backup': { de: 'Sicherung kopieren', tr: 'Yedeği kopyala', cs: 'Kopírovat zálohu' },
  'Backup copied': { de: 'Sicherung kopiert', tr: 'Yedek kopyalandı', cs: 'Záloha zkopírována' },
  'Paste a backup from another browser': { de: 'Sicherung aus einem anderen Browser einfügen', tr: 'Başka bir tarayıcıdan yedek yapıştır', cs: 'Vlož zálohu z jiného prohlížeče' },
  'Load': { de: 'Laden', tr: 'Yükle', cs: 'Načíst' },
  'That is not a valid backup.': { de: 'Das ist keine gültige Sicherung.', tr: 'Bu geçerli bir yedek değil.', cs: 'Tohle není platná záloha.' },

  // chyby z API
  'Invalid price': { de: 'Ungültiger Preis', tr: 'Geçersiz fiyat', cs: 'Neplatná cena' },
  'An artifact needs 1 to 7 bonuses': { de: 'Ein Artefakt braucht 1 bis 7 Boni', tr: 'Bir artefaktın 1 ile 7 arası bonusu olmalı', cs: 'Artefakt musí mít 1 až 7 bonusů' },
  'Unknown bonus': { de: 'Unbekannter Bonus', tr: 'Bilinmeyen bonus', cs: 'Neznámý bonus' },
  'Invalid data': { de: 'Ungültige Daten', tr: 'Geçersiz veri', cs: 'Neplatná data' },
  'The image must be JPG, PNG or WebP': { de: 'Das Bild muss JPG, PNG oder WebP sein', tr: 'Görsel JPG, PNG veya WebP olmalı', cs: 'Obrázek musí být JPG, PNG nebo WebP' },
  'The image is too large': { de: 'Das Bild ist zu groß', tr: 'Görsel çok büyük', cs: 'Obrázek je moc velký' },
  'Enter your in-game nick (2–24 characters, no spaces)': { de: 'Gib deinen Nick im Spiel an (2–24 Zeichen, ohne Leerzeichen)', tr: 'Oyun içi nickini yaz (2–24 karakter, boşluksuz)', cs: 'Napiš svůj nick ze hry (2–24 znaků, bez mezer)' },
  'Daily listing limit reached, try again tomorrow.': { de: 'Tageslimit für Angebote erreicht, versuch es morgen wieder.', tr: 'Günlük ilan sınırına ulaşıldı, yarın tekrar dene.', cs: 'Dnešní limit nabídek je vyčerpaný, zkus to zítra.' },
  'You already have this artifact listed.': { de: 'Dieses Artefakt hast du schon eingestellt.', tr: 'Bu artefaktı zaten listeledin.', cs: 'Tenhle artefakt už máš vystavený.' },
  'Listing not found': { de: 'Angebot nicht gefunden', tr: 'İlan bulunamadı', cs: 'Nabídka nenalezena' },
  'This is not your listing': { de: 'Das ist nicht dein Angebot', tr: 'Bu senin ilanın değil', cs: 'Tohle není tvoje nabídka' },
  'You can renew once every 24 hours': { de: 'Verlängern geht einmal alle 24 Stunden', tr: '24 saatte bir yenileyebilirsin', cs: 'Obnovit jde jednou za 24 hodin' },
  'Daily request limit reached, try again tomorrow.': { de: 'Tageslimit für Gesuche erreicht, versuch es morgen wieder.', tr: 'Günlük talep sınırına ulaşıldı, yarın tekrar dene.', cs: 'Dnešní limit poptávek je vyčerpaný, zkus to zítra.' },
  'Daily report limit reached': { de: 'Tageslimit für Meldungen erreicht', tr: 'Günlük şikayet sınırına ulaşıldı', cs: 'Dnešní limit nahlášení je vyčerpaný' },
  'You cannot report your own listing': { de: 'Du kannst dein eigenes Angebot nicht melden', tr: 'Kendi ilanını şikayet edemezsin', cs: 'Vlastní nabídku nahlásit nejde' },
  'Please try again': { de: 'Bitte versuch es erneut', tr: 'Lütfen tekrar dene', cs: 'Zkus to prosím znovu' },
};

// ---------- texty s čísly a jmény ----------
const agoTr = (s, L) => {
  let m;
  if (s === 'just now') return { de: 'gerade eben', tr: 'az önce', cs: 'právě teď' }[L];
  if ((m = s.match(/^(\d+) min ago$/))) return { de: `vor ${m[1]} Min.`, tr: `${m[1]} dk önce`, cs: `před ${m[1]} min` }[L];
  if ((m = s.match(/^(\d+) h ago$/))) return { de: `vor ${m[1]} Std.`, tr: `${m[1]} sa önce`, cs: `před ${m[1]} h` }[L];
  if ((m = s.match(/^(\d+) days? ago$/))) { const n = +m[1]; return { de: `vor ${n} ${de1(n, 'Tag', 'Tagen')}`, tr: `${n} gün önce`, cs: `před ${n} ${n === 1 ? 'dnem' : 'dny'}` }[L]; }
  return s;
};
const leftTr = (s, L) => {
  let m;
  if (s === 'expired') return S.expired[L];
  if ((m = s.match(/^expires in (\d+) h$/))) return { de: `läuft in ${m[1]} Std. ab`, tr: `${m[1]} sa sonra bitiyor`, cs: `vyprší za ${m[1]} h` }[L];
  if ((m = s.match(/^expires in (\d+) days?$/))) { const n = +m[1]; return { de: `läuft in ${n} ${de1(n, 'Tag', 'Tagen')} ab`, tr: `${n} gün sonra bitiyor`, cs: `vyprší za ${n} ${cz(n, 'den', 'dny', 'dní')}` }[L]; }
  return s;
};
const P = [
  [/^(posted|renewed) (.+?)(?: · (.+))?$/, (m, L) => {
    const a = agoTr(m[2], L), x = m[3] ? ' · ' + leftTr(m[3], L) : '';
    const v = { de: m[1] === 'posted' ? 'eingestellt' : 'erneuert', tr: m[1] === 'posted' ? 'eklendi' : 'yenilendi', cs: m[1] === 'posted' ? 'přidáno' : 'obnoveno' }[L];
    return (L === 'tr' ? `${a} ${v}` : `${v} ${a}`) + x;
  }],
  [/^Posted (.+?)(?:, renewed (.+?))? · (.+)$/, (m, L) => ({
    de: `Eingestellt ${m[1]}${m[2] ? `, erneuert ${m[2]}` : ''} · ${leftTr(m[3], L)}`,
    tr: `Eklenme ${m[1]}${m[2] ? `, yenilenme ${m[2]}` : ''} · ${leftTr(m[3], L)}`,
    cs: `Přidáno ${m[1]}${m[2] ? `, obnoveno ${m[2]}` : ''} · ${leftTr(m[3], L)}` }[L])],
  [/^Posted (.+)$/, (m, L) => ({ de: `Eingestellt ${m[1]}`, tr: `Eklenme ${m[1]}`, cs: `Přidáno ${m[1]}` }[L])],
  [/^expires in .+$/, (m, L) => leftTr(m[0], L)],
  [/^(\d+) listings? match( →)?$/, (m, L) => { const n = +m[1], a = m[2] || ''; return { de: `${n} ${de1(n, 'Angebot passt', 'Angebote passen')}${a}`, tr: `${n} ilan eşleşiyor${a}`, cs: `${n} ${cz(n, 'nabídka sedí', 'nabídky sedí', 'nabídek sedí')}${a}` }[L]; }],
  [/^(\d+) listings?$/, (m, L) => { const n = +m[1]; return { de: `${n} ${de1(n, 'Angebot', 'Angebote')}`, tr: `${n} ilan`, cs: `${n} ${cz(n, 'nabídka', 'nabídky', 'nabídek')}` }[L]; }],
  [/^(\d+) wanted requests?$/, (m, L) => { const n = +m[1]; return { de: `${n} ${de1(n, 'Gesuch', 'Gesuche')}`, tr: `${n} alım talebi`, cs: `${n} ${cz(n, 'poptávka', 'poptávky', 'poptávek')}` }[L]; }],
  [/^(\d+) new$/, (m, L) => ({ de: `${m[1]} neu`, tr: `${m[1]} yeni`, cs: `${m[1]} ${cz(+m[1], 'nová', 'nové', 'nových')}` }[L])],
  [/^(\d+) (match|matches)$/, (m, L) => { const n = +m[1]; return { de: `${n} Treffer`, tr: `${n} eşleşme`, cs: `${n} ${cz(n, 'shoda', 'shody', 'shod')}` }[L]; }],
  [/^(\d+) live$/, (m, L) => ({ de: `${m[1]} online`, tr: `${m[1]} yayında`, cs: `${m[1]} venku` }[L])],
  [/^Has all (\d+) stats you want$/, (m, L) => { const n = +m[1]; return { de: `Hat alle ${n} gesuchten Werte`, tr: `İstediğin ${n} statın hepsi var`, cs: `Má ${cz(n, 'hledaný stat', `všechny ${n} hledané staty`, `všech ${n} hledaných statů`)}` }[L]; }],
  [/^Has (\d+) of (\d+) stats you want$/, (m, L) => ({ de: `Hat ${m[1]} von ${m[2]} gesuchten Werten`, tr: `İstediğin ${m[2]} stattan ${m[1]} tanesi var`, cs: `Má ${m[1]} z ${m[2]} hledaných statů` }[L])],
  [/^want (.+)\+$/, (m, L) => ({ de: `gesucht ${m[1]}+`, tr: `istenen ${m[1]}+`, cs: `chceš ${m[1]}+` }[L])],
  [/^all (\d+) stats$/, (m, L) => { const n = +m[1]; return { de: `alle ${n} Werte`, tr: `${n} statın hepsi`, cs: `${cz(n, 'všechny', `všechny ${n}`, `všech ${n}`)}` }[L]; }],
  [/^at least (\d+) of (\d+)$/, (m, L) => ({ de: `mindestens ${m[1]} von ${m[2]}`, tr: `en az ${m[1]}/${m[2]}`, cs: `aspoň ${m[1]} z ${m[2]}` }[L])],
  [/^(\d+) of (\d+) is enough$/, (m, L) => ({ de: `${m[1]} von ${m[2]} reichen`, tr: `${m[2]} statın ${m[1]} tanesi yeterli`, cs: `stačí ${m[1]} z ${m[2]}` }[L])],
  [/^(\d+) of (\d+)$/, (m, L) => ({ de: `${m[1]} von ${m[2]}`, tr: `${m[1]}/${m[2]}`, cs: `${m[1]} z ${m[2]}` }[L])],
  [/^(\d+) characters$/, (m, L) => { const n = +m[1]; return { de: `${n} Zeichen`, tr: `${n} karakter`, cs: `${n} ${cz(n, 'znak', 'znaky', 'znaků')}` }[L]; }],
  [/^listed (\d+)×, from$/, (m, L) => ({ de: `${m[1]}× angeboten, ab`, tr: `${m[1]}× ilanda, en düşük`, cs: `nabízí se ${m[1]}×, od` }[L])],
  [/^sold (\d+)× recently, median$/, (m, L) => ({ de: `zuletzt ${m[1]}× verkauft, Median`, tr: `son zamanlarda ${m[1]}× satıldı, medyan`, cs: `nedávno prodáno ${m[1]}×, medián` }[L])],
  [/^\(median of (\d+)\)$/, (m, L) => ({ de: `(Median aus ${m[1]})`, tr: `(${m[1]} satışın medyanı)`, cs: `(medián z ${m[1]})` }[L])],
  [/^Found (\d+) (bonus|bonuses)\. Check the numbers on the right\.$/, (m, L) => { const n = +m[1]; return { de: `${n} ${de1(n, 'Bonus', 'Boni')} gefunden. Prüfe die Zahlen rechts.`, tr: `${n} bonus bulundu. Sağdaki rakamları kontrol et.`, cs: `Našel jsem ${n} ${cz(n, 'bonus', 'bonusy', 'bonusů')}. Zkontroluj čísla vpravo.` }[L]; }],
  [/^(\d+) buyers? (is|are) looking for this$/, (m, L) => { const n = +m[1]; return { de: `${n} ${de1(n, 'Käufer sucht', 'Käufer suchen')} das`, tr: `${n} alıcı bunu arıyor`, cs: `Shání to ${n} ${cz(n, 'kupující', 'kupující', 'kupujících')}` }[L]; }],
  [/^your artifact fits \((\d+)\)$/, (m, L) => ({ de: `dein Artefakt passt (${m[1]})`, tr: `artefaktın uyuyor (${m[1]})`, cs: `hodí se tvůj artefakt (${m[1]})` }[L])],
  [/^Added (\d+)$/, (m, L) => ({ de: `${m[1]} hinzugefügt`, tr: `${m[1]} eklendi`, cs: `Přidáno: ${m[1]}` }[L])],
  [/^rank (\d+)$/, (m, L) => ({ de: `Rang ${m[1]}`, tr: `rütbe ${m[1]}`, cs: `rank ${m[1]}` }[L])],
  [/^The market is just starting, so (\d+)$/, (m, L) => ({ de: `Der Markt startet gerade, deshalb sind ${m[1]}`, tr: `Pazar yeni açıldı, ${m[1]}`, cs: `Market teprve začíná, takže je tu přimícháno ${m[1]}` }[L])],
  [/^No stat called “(.*)”\.$/, (m, L) => ({ de: `Kein Wert namens „${m[1]}“.`, tr: `“${m[1]}” adında stat yok.`, cs: `Žádný stat „${m[1]}“.` }[L])],
  [/^Artifacts that also have (.+):$/, (m, L) => ({ de: `Artefakte, die auch ${m[1]} haben:`, tr: `Ayrıca ${m[1]} olan artefaktlar:`, cs: `Artefakty, které mají taky ${m[1]}:` }[L])],
  [/^Try “at least 1 of (\d+)”, lower a minimum, save it to favourites to spot new matches, or$/, (m, L) => ({ de: `Probier „mindestens 1 von ${m[1]}“, senke ein Minimum, speichere es in den Favoriten, um neue Treffer zu sehen, oder`, tr: `“en az 1/${m[1]}” dene, bir minimumu düşür, yeni eşleşmeler için favorilere kaydet ya da`, cs: `Zkus „aspoň 1 z ${m[1]}“, sniž minimum, ulož si to do oblíbených a uvidíš nové shody, nebo` }[L])],
  [/^Try “at least 1 of (\d+)”, lower a minimum,$/, (m, L) => ({ de: `Probier „mindestens 1 von ${m[1]}“, senke ein Minimum,`, tr: `“en az 1/${m[1]}” dene, bir minimumu düşür,`, cs: `Zkus „aspoň 1 z ${m[1]}“, sniž minimum,` }[L])],
  [/^Contact (.+)$/, (m, L) => ({ de: `${m[1]} kontaktieren`, tr: `${m[1]} ile iletişim`, cs: `Kontaktovat ${m[1]}` }[L])],
  [/^Discord: (.+) \(click to copy\)$/, (m, L) => ({ de: `Discord: ${m[1]} (zum Kopieren klicken)`, tr: `Discord: ${m[1]} (kopyalamak için tıkla)`, cs: `Discord: ${m[1]} (klikni a zkopíruj)` }[L])],
  [/^Copied Discord name (.+)\.$/, (m, L) => ({ de: `Discord-Name ${m[1]} kopiert.`, tr: `Discord adı ${m[1]} kopyalandı.`, cs: `Discord ${m[1]} zkopírován.` }[L])],
  [/^Copied (.+)\. Whisper them in game\.$/, (m, L) => ({ de: `${m[1]} kopiert. Flüstere ihn im Spiel an.`, tr: `${m[1]} kopyalandı. Oyunda fısılda.`, cs: `${m[1]} zkopírován. Napiš mu ve hře.` }[L])],
  [/^Copied (.+)$/, (m, L) => ({ de: `${m[1]} kopiert`, tr: `${m[1]} kopyalandı`, cs: `Zkopírováno: ${m[1]}` }[L])],
  [/^Minimum (.+) \((.+)\)$/, (m, L) => ({ de: `Minimum ${m[1]} (${m[2]})`, tr: `En az ${m[1]} (${m[2]})`, cs: `Minimum ${m[1]} (${m[2]})` }[L])],
  [/^(.+), range (.+)$/, (m, L) => ({ de: `${m[1]}, Bereich ${m[2]}`, tr: `${m[1]}, aralık ${m[2]}`, cs: `${m[1]}, rozsah ${m[2]}` }[L])],
  [/^sold for (.+)$/, (m, L) => ({ de: `verkauft für ${m[1]}`, tr: `${m[1]} karşılığı satıldı`, cs: `prodáno za ${m[1]}` }[L])],
  [/^max (.+)$/, (m, L) => ({ de: `max. ${m[1]}`, tr: `maks. ${m[1]}`, cs: `max ${m[1]}` }[L])],
  [/^(.+) is outside its range (.+)\.$/, (m, L) => ({ de: `${m[1]} liegt außerhalb des Bereichs ${m[2]}.`, tr: `${m[1]} aralık dışında: ${m[2]}.`, cs: `${m[1]} je mimo rozsah ${m[2]}.` }[L])],
  [/^Minimum for (.+) is out of range$/, (m, L) => ({ de: `Minimum für ${m[1]} liegt außerhalb des Bereichs`, tr: `${m[1]} için minimum aralık dışında`, cs: `Minimum ${m[1]} je mimo rozsah` }[L])],
  [/^(.+) is out of range$/, (m, L) => ({ de: `${m[1]} liegt außerhalb des Bereichs`, tr: `${m[1]} aralık dışında`, cs: `${m[1]} je mimo rozsah` }[L])],
  [/^(.+) is there twice$/, (m, L) => ({ de: `${m[1]} ist doppelt`, tr: `${m[1]} iki kez var`, cs: `${m[1]} je tam dvakrát` }[L])],
];

// přeloží jeden text (zachová mezery kolem)
export function T(src) {
  if (LANG === 'en' || src == null) return src;
  const s = String(src), t = s.trim(); if (!t) return s;
  let out = S[t]?.[LANG];
  if (out == null) for (const [re, fn] of P) { const m = t.match(re); if (m) { out = fn(m, LANG); break; } }
  if (out == null) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  return lead + out + trail;
}

// ---------- překlad DOMu po vykreslení ----------
const ATTRS = ['placeholder', 'title', 'aria-label'];
const srcText = new WeakMap(), outText = new WeakMap(), srcAttr = new WeakMap();
const SKIP = 'script,style,textarea,select.sb,select.wb,.nm,.nick,.dc,.note,.stl,.fs,.bignick,.picked b,.logo';
function trNode(n) {
  if (n.parentElement?.closest(SKIP)) return;
  const cur = n.nodeValue;
  const src = srcText.has(n) && outText.get(n) === cur ? srcText.get(n) : cur;
  const out = LANG === 'en' ? src : T(src);
  srcText.set(n, src); outText.set(n, out);
  if (out !== cur) n.nodeValue = out;
}
function trEl(el) {
  let m = srcAttr.get(el); if (!m) { m = {}; srcAttr.set(el, m); }
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a), rec = m[a];
    const src = rec && rec.out === cur ? rec.src : cur;
    const out = LANG === 'en' ? src : T(src);
    m[a] = { src, out };
    if (out !== cur) el.setAttribute(a, out);
  }
}
export function translateTree(root = document.body) {
  if (!root) return;
  if (root.nodeType === 3) { trNode(root); return; }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) trNode(n);
  if (root.nodeType === 1) { trEl(root); root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(trEl); }
}
let obs = null, busy = false;
export function startI18n(lang) {
  LANG = LANGS[lang] ? lang : 'en';
  document.documentElement.lang = LANG;
  if (!obs) {
    obs = new MutationObserver(list => {
      if (busy) return; busy = true;
      try {
        for (const r of list) {
          if (r.type === 'childList') r.addedNodes.forEach(x => translateTree(x));
          else if (r.type === 'characterData') trNode(r.target);
          else if (r.type === 'attributes') trEl(r.target);
        }
      } finally { obs.takeRecords(); busy = false; }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  busy = true; try { translateTree(document.body); } finally { obs.takeRecords(); busy = false; }
}
