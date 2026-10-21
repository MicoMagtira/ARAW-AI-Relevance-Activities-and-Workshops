// Chatbot Sandbox safety checks (docs/DECISIONS-LOG.md, 2026-10-21). Pure functions, so they are unit tested on their own.
//  - detectRedFlags: CONTENT_GUIDE red flags ("Magpatingin agad") in English, Filipino, Cebuano, Ilokano and Hiligaynon.
//    Thoughts of self-harm are kept apart: they always get the hotline and never go to the model.
//  - detectPersonalData: names, phone and ID numbers, emails, addresses and diagnoses, for the "real chatbots may store this" nudge.
//  - createDoseFilter: hides any sentence of a streamed answer that gives a dose or a schedule.
// Word lists are deliberately broad: a false alarm costs one tap, a missed red flag could cost much more.

export const MAX_INPUT = 500;

/** Lowercase, accents removed, curly quotes made straight, spaces collapsed. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A term matches at the start of a word. Short terms (4 letters or fewer) must be the whole word, so "aso" (dog) does not
 * match inside "kaso" and "bat" does not match inside "bata"; longer terms work as stems ("nahimatay", "hinihingal").
 */
function termRe(term: string): RegExp {
  const t = escape(normalize(term));
  return term.length <= 4 ? new RegExp(`(?:^|[^a-z0-9])${t}(?![a-z0-9])`) : new RegExp(`(?:^|[^a-z0-9])${t}`);
}

interface Rule {
  id: RedFlagId;
  /** Any one of these phrases is enough. */
  any?: readonly string[];
  /** Or: one term from every group (e.g. a child word plus a dehydration sign). */
  all?: readonly (readonly string[])[];
}

export type RedFlagId = 'chest' | 'breathing' | 'stroke' | 'seizure' | 'bleeding' | 'dengue' | 'dehydration' | 'babyFever' | 'bite' | 'selfHarm';

const CHILD = ['child', 'kid', 'toddler', 'baby', 'bata', 'anak', 'sanggol', 'bebe', 'beybi', 'masuso', 'ubing', 'maladaga', 'lapsag', 'infant'];
const BABY = ['baby', 'infant', 'newborn', 'sanggol', 'bagong silang', 'bebe', 'beybi', 'masuso', 'maladaga', 'lapsag', 'month old', 'months old', 'buwang gulang', 'bulan pa', 'bulan nga'];

const RULES: readonly Rule[] = [
  {
    id: 'selfHarm',
    any: [
      'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die', 'wanna die', 'self-harm', 'self harm', 'hurt myself', 'cut myself',
      'magpakamatay', 'nagpapakamatay', 'patayin ang sarili', 'papatayin ko ang sarili', 'patayin ko ang sarili', 'gusto ko nang mamatay',
      'gusto ko ng mamatay', 'ayoko nang mabuhay', 'ayoko ng mabuhay', 'saktan ang sarili', 'sasaktan ko ang sarili', 'maghikog', 'naghikog',
      'gusto na ko mamatay', 'gusto nako mamatay', 'dili na ko gusto mabuhi', 'agpakamatay', 'kayat ko ti matay', 'kayatko ti matay',
      'gusto ko na mapatay', 'indi na ko gusto mabuhi', 'pakamatay',
    ],
  },
  {
    id: 'chest',
    any: ['heart attack', 'atake sa puso', 'inatake sa puso', 'atake ti puso', 'atake sa kasingkasing', 'atake sa tagipusuon'],
    all: [
      ['chest', 'dibdib', 'dughan', 'barukong'],
      [
        'pain', 'hurt', 'ache', 'tight', 'pressure', 'sakit', 'masakit', 'sumasakit', 'nananakit', 'nagsakit', 'nagasakit', 'gisakit',
        'agsakit', 'kirot', 'kumikirot', 'sikip', 'naninikip', 'paninikip', 'hapdi', 'bigat', 'mabigat', 'saket', 'masaket',
      ],
    ],
  },
  {
    id: 'breathing',
    any: ['shortness of breath', 'short of breath', 'hinihingal', 'naghahabol ng hininga', 'hinahabol ang hininga', 'nangapos ang ginhawa', 'naghangos'],
    all: [
      // Filipino verbs take infixes (h-um-inga), so the common forms are listed one by one
      [
        'breath', 'hinga', 'huminga', 'humihinga', 'makahinga', 'paghinga', 'hininga', 'ginhawa', 'moginhawa', 'makaginhawa', 'magginhawa',
        'nagaginhawa', 'gininhawa', 'anges', 'agang-ang', 'umanges', 'agangsab',
      ],
      [
        "can't", 'cannot', 'can not', 'trouble', 'difficult', 'hard to', 'struggling', 'hirap', 'nahihirapan', 'hindi maka', 'di maka', 'kapos',
        'lisod', 'dili maka', 'budlay', 'indi maka', 'narigat', 'saan a maka', 'saan nga maka', 'awan ti',
      ],
    ],
  },
  {
    id: 'stroke',
    any: [
      'stroke', 'istrok', 'face drooping', 'drooping face', 'face is drooping', 'slurred speech', 'arm weakness', 'ngiwi ang mukha',
      'tabingi ang mukha', 'tabingi ang bibig', 'nabulol', 'hindi makapagsalita', 'namanhid ang kalahati', 'nangiwi', 'dili makasulti',
      'saan a makasao', 'indi makahambal',
    ],
  },
  {
    id: 'seizure',
    any: [
      'seizure', 'convulsion', 'convulsing', 'kombulsyon', 'kumbulsyon', 'nangisay', 'nangingisay', 'kinukumbulsyon', 'nagkisay', 'nagkikisay',
      'fainted', 'fainting', 'passed out', 'unconscious', 'nawalan ng malay', 'walang malay', 'nahimatay', 'hinimatay', 'nakuyapan', 'nakuyap',
      'nawad-an og panimuot', 'walay panimuot', 'natalimudaw', 'nawalan sang malay', 'nadulaan sang malay',
    ],
  },
  {
    id: 'bleeding',
    any: ['vomiting blood', 'coughing blood', 'nagsusuka ng dugo', 'umuubo ng dugo', 'nagsuka og dugo', 'nagsarua ti dara', 'nagsuka sang dugo'],
    all: [
      ['bleed', 'blood', 'dugo', 'dinudugo', 'nagdudugo', 'dumudugo', 'nagdugo', 'dara', 'agdardara'],
      [
        'heavy', 'severe', "won't stop", 'will not stop', 'not stopping', 'a lot', 'hindi tumitigil', 'ayaw tumigil', 'marami', 'malakas', 'daghan',
        'dili mohunong', 'adu', 'saan nga agsardeng', 'madamo', 'indi mag-untat', 'gilagid', 'gums', 'lagos', 'gusi',
      ],
    ],
  },
  {
    id: 'dengue',
    all: [
      ['dengue', 'dengge'],
      ['bleed', 'blood', 'dugo', 'dara', 'vomit', 'suka', 'sarua', 'stomach pain', 'belly pain', 'abdominal pain', 'sakit ng tiyan', 'sakit sa tiyan', 'masakit ang tiyan', 'sakit sa tiyan', 'sakit ti tian', 'black stool', 'itim na dumi', 'very weak', 'nanghihina', 'luya kaayo'],
    ],
  },
  {
    id: 'dehydration',
    all: [
      CHILD,
      [
        'no tears', 'walang luha', 'walay luha', 'awan lua', 'wala sang luha', 'not peeing', 'no urine', 'little urine', 'hindi umiihi', 'hindi naiihi',
        'wala nag-ihi', 'saan nga umisbo', 'dehydrat', 'sunken eyes', 'lubog ang mata', 'very sleepy', 'sobrang antok', 'matamlay', 'lethargic',
      ],
    ],
  },
  {
    id: 'babyFever',
    all: [BABY, ['fever', 'lagnat', 'nilalagnat', 'hilanat', 'gurigor', 'sinat', 'hilantan', 'kalintura']],
  },
  {
    id: 'bite',
    all: [
      ['bite', 'bitten', 'bit', 'kagat', 'kinagat', 'nakagat', 'gikagat', 'napaak', 'pinaak', 'kinagat', 'ginkagat', 'scratch', 'kalmot', 'kinalmot', 'gikalmot', 'kinaraw'],
      ['dog', 'cat', 'puppy', 'kitten', 'aso', 'pusa', 'tuta', 'kuting', 'iro', 'iring', 'ido', 'monkey', 'unggoy', 'bat', 'paniki', 'animal', 'hayop', 'rabies'],
    ],
  },
];

const COMPILED = RULES.map((r) => ({
  id: r.id,
  any: (r.any ?? []).map(termRe),
  all: (r.all ?? []).map((group) => group.map(termRe)),
}));

export interface RedFlagResult {
  ids: RedFlagId[];
  /** Thoughts of self-harm: the hotline card, and the message never goes to the model. */
  selfHarm: boolean;
}

export function detectRedFlags(text: string): RedFlagResult {
  const s = normalize(text);
  const ids = COMPILED.filter(
    (r) => r.any.some((re) => re.test(s)) || (r.all.length > 0 && r.all.every((group) => group.some((re) => re.test(s)))),
  ).map((r) => r.id);
  return { ids, selfHarm: ids.includes('selfHarm') };
}

export type PersonalKind = 'name' | 'phone' | 'id' | 'email' | 'address' | 'diagnosis';

const PHONE = /(?:\+?63|\b0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;
const LONG_NUMBER = /\d(?:[\s-]?\d){8,}/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const NAME =
  /(?:^|[^a-z])(?:my name is|my name's|i am called|call me|ako si|ako po si|ang pangalan ko|pangalan ko ay|ang akong pangalan|akong ngalan|ang ngalan nako|ngalan nako|ti nagan ko|nagan ko ket|naganak ket|ang akon ngalan|akon ngalan)\s+[a-z]/;
const ADDRESS =
  /(?:^|[^a-z])(?:i live at|i live in|my address|home address|nakatira ako sa|address ko|ang akong address|nagpuyo ko sa|nagnaed ak|agnanaed ak|nagaestar ako sa|ang akon address)/;
const DIAGNOSIS =
  /(?:^|[^a-z])(?:diagnosed|na-diagnose|nadiagnose|na diagnose|my diagnosis|diagnosis ko|nagpositibo|positive ako|positive for|nag-positive|may hiv|may tb|may cancer|may kanser|i have hiv|i have tb|i have cancer)/;

/** What kinds of personal data a message seems to contain (empty when none). */
export function detectPersonalData(text: string): PersonalKind[] {
  const raw = text.normalize('NFC');
  const s = normalize(text);
  const kinds: PersonalKind[] = [];
  const phone = PHONE.test(raw);
  if (phone) kinds.push('phone');
  if (LONG_NUMBER.test(phone ? raw.replace(PHONE, ' ') : raw)) kinds.push('id');
  if (EMAIL.test(raw)) kinds.push('email');
  if (NAME.test(s)) kinds.push('name');
  if (ADDRESS.test(s)) kinds.push('address');
  if (DIAGNOSIS.test(s)) kinds.push('diagnosis');
  return kinds;
}

/* ---------- Dose filter ---------- */

const NUM = String.raw`\d+(?:[.,/]\d+)?`;
const WORD_NUM = String.raw`(?:one|two|three|four|half|isa|isang|dalawa|dalawang|tatlo|tatlong|kalahati|usa|usa ka|duha|duha ka|tulo|tulo ka|maysa|dua|tallo|tunga|isa ka|duha ka|tatlo ka)`;
const UNIT = String.raw`(?:mg|mcg|µg|ug|g|grams?|gramo|ml|cc|iu|units?|tabs?|tablets?|tableta|tabletas|tabletang|kapsula|capsules?|caps|pills?|drops?|patak|kutsarita|kutsara|teaspoons?|tablespoons?|tsp|tbsp|puffs?|sachets?|ka tableta|nga tableta)`;
const DOSE_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`${NUM}\s*-?\s*${UNIT}(?![a-z])`, 'i'),
  new RegExp(String.raw`(?:^|[^a-z])${WORD_NUM}\s+${UNIT}(?![a-z])`, 'i'),
  /(?:^|[^a-z])(?:once|twice|thrice|\d+\s*times)\s+(?:a|per|each)\s+day/i,
  /(?:^|[^a-z])every\s+\d+\s*(?:-\s*\d+\s*)?(?:hours?|hrs?)/i,
  /(?:^|[^a-z])(?:kada|tuwing|matag|tunggal|kada maysa a|sagpat)\s+\d+\s*(?:-\s*\d+\s*)?(?:oras|ka oras|nga oras)/i,
  /(?:^|[^a-z])\d+\s*(?:beses|ka beses|ka higayon|nga beses|a daras)/i,
  /(?:^|[^a-z])(?:dosage|dose of|doses of|dosis)(?![a-z])/i,
];

/** True when a sentence gives an amount or a schedule for a medicine. */
export const hasDose = (sentence: string): boolean => DOSE_PATTERNS.some((re) => re.test(sentence));

/** A sentence ends at . ! ? or a line break (a decimal point such as "2.5" is not an end). */
const SENTENCE_END = /(?<!\d)[.!?](?=\s|$)|(?<=\d)[.!?](?=\s)|\n/g;

export interface DoseFilter {
  /** Add the next streamed piece; returns the text that is safe to show so far. */
  push(chunk: string): string;
  /** The stream ended: returns the final safe text. */
  end(): string;
  /** True once any sentence was hidden. */
  readonly hidDose: boolean;
}

/**
 * Streamed answers are checked sentence by sentence. Finished sentences with a dose become `replacement`; the unfinished
 * last sentence is shown only up to its first digit until it ends, so "500 mg" never flashes on screen.
 */
export function createDoseFilter(replacement: string): DoseFilter {
  let raw = '';
  let hid = false;

  const render = (final: boolean): string => {
    let out = '';
    let start = 0;
    SENTENCE_END.lastIndex = 0;
    for (let m = SENTENCE_END.exec(raw); m; m = SENTENCE_END.exec(raw)) {
      const end = m.index + m[0].length;
      out += clean(raw.slice(start, end));
      start = end;
    }
    const tail = raw.slice(start);
    if (final) return out + clean(tail);
    if (hasDose(tail)) return out;
    const digit = tail.search(/\d/);
    return out + (digit >= 0 ? tail.slice(0, digit) : tail);
  };

  const clean = (sentence: string): string => {
    if (!hasDose(sentence)) return sentence;
    hid = true;
    const lead = sentence.match(/^\s*/)?.[0] ?? '';
    return `${lead}${replacement}${sentence.endsWith('\n') ? '\n' : ''}`;
  };

  return {
    push(chunk: string) {
      raw += chunk;
      return render(false);
    },
    end() {
      return render(true).trimEnd();
    },
    get hidDose() {
      return hid;
    },
  };
}
