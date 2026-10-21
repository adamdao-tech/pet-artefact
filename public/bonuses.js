// ============================================================
//  Pet artefakty – bonusy, které se můžou rollnout, a jejich rozsah.
//  Sdílí to prohlížeč (app.js) i worker (validace na serveru).
//  `id` je stabilní krátký klíč, ukládá se do databáze. NEMĚNIT.
//  w = výchozí váha pro PvM skóre (3 top, 2 ok, 1 slabé).
// ============================================================
export const GROUPS = [
  { id: 'utok',   cs: 'Útok',              en: 'Attack' },
  { id: 'strong', cs: 'Strong against',    en: 'Strong against' },
  { id: 'elem',   cs: 'Elementy a magie',  en: 'Elements & magic' },
  { id: 'farm',   cs: 'Farm a utility',    en: 'Farm & utility' },
  { id: 'obrana', cs: 'Obrana a sustain',  en: 'Defense & sustain' },
  { id: 'cc',     cs: 'Šance na efekt',    en: 'Effect chance' },
];

export const BONUSES = [
  { id: 'exp',     name: '% Chance for EXP Bonus',           s: 'EXP Bonus chance', min: 1,   max: 20,   unit: '%', g: 'farm',   w: 2 },
  { id: 'pierce',  name: '% Chance for piercing Hits',       s: 'Piercing chance',  min: 1,   max: 10,   unit: '%', g: 'utok',   w: 3 },
  { id: 'drop',    name: '% increased Item-Drop',            s: 'Item-Drop',        min: 1,   max: 20,   unit: '%', g: 'farm',   w: 3 },
  { id: 'armor',   name: 'Armor',                            s: 'Armor',            min: 10,  max: 200,  unit: '',  g: 'obrana', w: 1 },
  { id: 'aspd',    name: 'Attack Speed',                     s: 'Attack Speed',     min: 1,   max: 10,   unit: '%', g: 'utok',   w: 2 },
  { id: 'att',     name: 'Attack value',                     s: 'Attack value',     min: 10,  max: 100,  unit: '',  g: 'utok',   w: 3 },
  { id: 'avg',     name: 'Average Damage (AVG)',             s: 'AVG Damage',       min: 1,   max: 10,   unit: '%', g: 'utok',   w: 3 },
  { id: 'avgres',  name: 'Average Damage Resistance',        s: 'AVG Resistance',   min: 1,   max: 5,    unit: '%', g: 'obrana', w: 1 },
  { id: 'burn',    name: 'Burn Damage',                      s: 'Burn Damage',      min: 1,   max: 20,   unit: '%', g: 'elem',   w: 2, c: 'fire' },
  { id: 'cast',    name: 'Casting Speed',                    s: 'Casting Speed',    min: 1,   max: 10,   unit: '%', g: 'utok',   w: 2 },
  { id: 'crit',    name: 'Chance of critical hit',           s: 'Critical chance',  min: 1,   max: 10,   unit: '%', g: 'utok',   w: 3 },
  { id: 'stun',    name: 'Chance to Stun',                   s: 'Stun chance',      min: 1,   max: 3,    unit: '%', g: 'cc',     w: 1 },
  { id: 'curse',   name: 'Curse Damage',                     s: 'Curse Damage',     min: 1,   max: 20,   unit: '%', g: 'elem',   w: 2, c: 'curse' },
  { id: 'defg',    name: 'Def Grade Bonus',                  s: 'Def Grade Bonus',  min: 50,  max: 300,  unit: '',  g: 'obrana', w: 1 },
  { id: 'hpoh',    name: 'HP gain on hit',                   s: 'HP gain on hit',   min: 1,   max: 20,   unit: '%', g: 'obrana', w: 1 },
  { id: 'light',   name: 'Lightning Damage',                 s: 'Lightning Damage', min: 1,   max: 20,   unit: '%', g: 'elem',   w: 2, c: 'lightning' },
  { id: 'lsf',     name: 'Lightspeed Factor',                s: 'Lightspeed Factor',min: 1,   max: 3,    unit: '%', g: 'farm',   w: 1 },
  { id: 'magic',   name: 'Magical Power',                    s: 'Magical Power',    min: 1,   max: 20,   unit: '%', g: 'elem',   w: 2, c: 'magic' },
  { id: 'hp',      name: 'Max. HP',                          s: 'Max. HP',          min: 100, max: 3000, unit: '',  g: 'obrana', w: 2 },
  { id: 'sp',      name: 'Max. SP',                          s: 'Max. SP',          min: 100, max: 3000, unit: '',  g: 'obrana', w: 1 },
  { id: 'poison',  name: 'Poison Damage',                    s: 'Poison Damage',    min: 1,   max: 20,   unit: '%', g: 'elem',   w: 2, c: 'poison' },
  { id: 'poisch',  name: 'Poisoning chance',                 s: 'Poisoning chance', min: 1,   max: 3,    unit: '%', g: 'cc',     w: 1 },
  { id: 'rescrit', name: 'Resistance against critical hits', s: 'Res. vs critical', min: 1,   max: 10,   unit: '%', g: 'obrana', w: 1 },
  { id: 'respier', name: 'Resistance against piercing hits', s: 'Res. vs piercing', min: 1,   max: 10,   unit: '%', g: 'obrana', w: 1 },
  { id: 'ressd',   name: 'Resistance against Skill Damage',  s: 'Res. vs Skill Damage', min: 1, max: 5,  unit: '%', g: 'obrana', w: 1 },
  { id: 'resmon',  name: 'Resistance to Monsters',           s: 'Res. vs Monsters', min: 1,   max: 5,    unit: '%', g: 'obrana', w: 2 },
  { id: 'sd',      name: 'Skill Damage (SD)',                s: 'Skill Damage',     min: 1,   max: 10,   unit: '%', g: 'utok',   w: 3 },
  { id: 'sksp',    name: 'Skill Speed',                      s: 'Skill Speed',      min: 1,   max: 10,   unit: '%', g: 'utok',   w: 2 },
  { id: 'slow',    name: 'Slowing chance',                   s: 'Slowing chance',   min: 1,   max: 3,    unit: '%', g: 'cc',     w: 1 },
  { id: 'spoh',    name: 'SP gain on hit',                   s: 'SP gain on hit',   min: 1,   max: 35,   unit: '%', g: 'obrana', w: 1 },
  { id: 'animal',  name: 'Strong against Animal',            s: 'vs. Animal',       min: 5,   max: 20,   unit: '%', g: 'strong', w: 1 },
  { id: 'devil',   name: 'Strong against Devils',            s: 'vs. Devils',       min: 1,   max: 15,   unit: '%', g: 'strong', w: 1 },
  { id: 'eso',     name: 'Strong against Esoteric',          s: 'vs. Esoteric',     min: 1,   max: 15,   unit: '%', g: 'strong', w: 1 },
  { id: 'half',    name: 'Strong against Half Humans',       s: 'vs. Half Humans',  min: 1,   max: 15,   unit: '%', g: 'strong', w: 1 },
  { id: 'metin',   name: 'Strong against Metinstones',       s: 'vs. Metinstones',  min: 1,   max: 20,   unit: '%', g: 'strong', w: 3 },
  { id: 'mon',     name: 'Strong against Monsters',          s: 'vs. Monsters',     min: 1,   max: 20,   unit: '%', g: 'strong', w: 3 },
  { id: 'orc',     name: 'Strong against Orcs',              s: 'vs. Orcs',         min: 1,   max: 15,   unit: '%', g: 'strong', w: 1 },
  { id: 'portal',  name: 'Strong against Portals',           s: 'vs. Portals',      min: 1,   max: 30,   unit: '%', g: 'strong', w: 3 },
  { id: 'undead',  name: 'Strong against Undead',            s: 'vs. Undead',       min: 1,   max: 15,   unit: '%', g: 'strong', w: 1 },
  { id: 'thorns',  name: 'Thorns',                           s: 'Thorns',           min: 50,  max: 500,  unit: '',  g: 'obrana', w: 1 },
  { id: 'univ',    name: 'Universality',                     s: 'Universality',     min: 1,   max: 15,   unit: '',  g: 'strong', w: 2 },
];

export const BY_ID = Object.fromEntries(BONUSES.map(b => [b.id, b]));
export const MAX_LINES = 7;
// Rankovaný artefakt (Pet Trophy) může mít hodnoty nad základním maximem.
export const OVER_MAX = 2;
