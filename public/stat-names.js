// ============================================================
//  Lokalizované názvy statů (pro UI a pro čtení screenshotů z DE/TR/CZ klienta).
//  Zdroj: oficiální Metin2 wiki od Gameforge
//    DE  de-wiki.metin2.gameforge.com/index.php/Boni         (HP = TP, SP = MP)
//    TR  tr-wiki.metin2.gameforge.com/index.php/6._ve_7._Efsunlar
//    CZ  cz-wiki.metin2.gameforge.com/index.php/Bonusy        (HP = ZB, SP = MB)
//  OFFICIAL = id, u kterých název sedí s wiki. Ostatní jsou staty, které klasický
//  Metin2 nemá (Nihor2 pet artefakty), přeložené popisně.
// ============================================================
export const OFFICIAL = new Set(['exp', 'pierce', 'drop', 'armor', 'aspd', 'att', 'avg', 'cast', 'crit', 'stun', 'hp', 'sp', 'poisch', 'sd', 'slow',
  'animal', 'devil', 'eso', 'half', 'metin', 'orc', 'undead', 'mon', 'light']);

export const STAT_NAMES = {
  de: {
    exp: 'EXP-Bonus-Chance', pierce: 'Durchbohrender Treffer', drop: 'Item-Drop', armor: 'Verteidigung', aspd: 'Angriffsgeschwindigkeit',
    att: 'Angriffswert', avg: 'Durchschnittsschaden', avgres: 'Widerst. Durchschnittsschaden', burn: 'Brandschaden', cast: 'Zaubergeschwindigkeit',
    crit: 'Kritischer Treffer', stun: 'Ohnmachtschance', curse: 'Fluchschaden', defg: 'Verteidigungsgrad-Bonus', hpoh: 'TP bei Treffer',
    light: 'Blitzschaden', lsf: 'Lichtgeschwindigkeit', magic: 'Magische Kraft', hp: 'Max. TP', sp: 'Max. MP', poison: 'Giftschaden',
    poisch: 'Vergiftungschance', rescrit: 'Widerst. krit. Treffer', respier: 'Widerst. durchb. Treffer', ressd: 'Widerst. Fertigkeitsschaden',
    resmon: 'Widerst. gegen Monster', sd: 'Fertigkeitsschaden', sksp: 'Fertigkeitsgeschwindigkeit', slow: 'Verlangsamungschance',
    spoh: 'MP bei Treffer', animal: 'Stark gg. Tiere', devil: 'Stark gg. Teufel', eso: 'Stark gg. Esoterische', half: 'Stark gg. Halbmenschen',
    metin: 'Stark gg. Metinsteine', mon: 'Stark gg. Monster', orc: 'Stark gg. Orks', portal: 'Stark gg. Portale', undead: 'Stark gg. Untote',
    thorns: 'Dornen', univ: 'Universalität',
  },
  tr: {
    exp: 'EXP Bonus Şansı', pierce: 'Delici Vuruş Şansı', drop: 'Eşya Düşürme Şansı', armor: 'Savunma', aspd: 'Saldırı Hızı',
    att: 'Saldırı Değeri', avg: 'Ortalama Zarar', avgres: 'Ortalama Zarar Direnci', burn: 'Yanma Hasarı', cast: 'Büyü Hızı',
    crit: 'Kritik Vuruş Şansı', stun: 'Bayılma Şansı', curse: 'Lanet Hasarı', defg: 'Savunma Derecesi Bonusu', hpoh: 'Vuruşta HP',
    light: 'Şimşek Hasarı', lsf: 'Işık Hızı Faktörü', magic: 'Büyü Gücü', hp: 'Max. HP', sp: 'Max. SP', poison: 'Zehir Hasarı',
    poisch: 'Zehirleme Şansı', rescrit: 'Kritik Vuruş Direnci', respier: 'Delici Vuruş Direnci', ressd: 'Beceri Hasarı Direnci',
    resmon: 'Canavar Direnci', sd: 'Beceri Hasarı', sksp: 'Beceri Hızı', slow: 'Yavaşlatma Şansı', spoh: 'Vuruşta SP',
    animal: 'Hayvanlara Karşı Güçlü', devil: 'Şeytanlara Karşı Güçlü', eso: 'Mistiklere Karşı Güçlü', half: 'Yarı İnsanlara Karşı Güçlü',
    metin: 'Metin Taşlarına Karşı Güçlü', mon: 'Canavarlara Karşı Güçlü', orc: 'Orklara Karşı Güçlü', portal: 'Portallara Karşı Güçlü',
    undead: 'Ölümsüzlere Karşı Güçlü', thorns: 'Diken', univ: 'Evrensellik',
  },
  cs: {
    exp: 'Šance na bonus BZK', pierce: 'Pronikavý zásah', drop: 'Drop předmětů', armor: 'Obrana', aspd: 'Rychlost útoku',
    att: 'Hodnota útoku', avg: 'Průměrná škoda', avgres: 'Odolnost proti průměrné škodě', burn: 'Poškození popálením', cast: 'Rychlost kouzla',
    crit: 'Kritický zásah', stun: 'Šance na bezvědomí', curse: 'Poškození kletbou', defg: 'Bonus stupně obrany', hpoh: 'ZB při zásahu',
    light: 'Poškození bleskem', lsf: 'Faktor rychlosti světla', magic: 'Magická síla', hp: 'Max. ZB', sp: 'Max. MB', poison: 'Poškození jedem',
    poisch: 'Šance na otrávení', rescrit: 'Odolnost proti krit. zásahu', respier: 'Odolnost proti pronik. zásahu',
    ressd: 'Odolnost proti poškození dovedností', resmon: 'Odolnost proti příšerám', sd: 'Poškození dovedností', sksp: 'Rychlost dovedností',
    slow: 'Šance na zpomalení', spoh: 'MB při zásahu', animal: 'Silný proti zvířatům', devil: 'Silný proti ďáblu', eso: 'Silný proti ezoterikům',
    half: 'Silný proti pololidem', metin: 'Silný proti kamenům metin', mon: 'Silný proti příšerám', orc: 'Silný proti orkům',
    portal: 'Silný proti portálům', undead: 'Silný proti nemrtvým', thorns: 'Trny', univ: 'Univerzálnost',
  },
};

// další názvy, jak je píše hra (pro čtení screenshotů), id → seznam
export const GAME_ALIASES = {
  exp: ['Chance auf EXP Bonus'], drop: ['Chance, eine doppelte Menge von Gegenständen fallen zu lassen', 'İki Kat Eşya Düşürme Şansı', 'šance, nechat dvojnásobně spadnout předměty'],
  pierce: ['Chance auf durchbohrenden Treffer', 'šance na pronikavý zásah'], crit: ['Chance auf kritischen Treffer', 'šance na kritický zásah'],
  cast: ['Rychlost kouzlení'], stun: ['Ohnmachtchance'], metin: ['Metin Taşı Karşısında Güçlü', 'Metin taşlarına karşı güç'],
  portal: ['Portaldamage', 'Portalschaden'], light: ['Blitzschaden'],
};
