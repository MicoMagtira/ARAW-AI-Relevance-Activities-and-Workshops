// "Ara caught this": a short tip under an answer when the chat touches something AI is known to get wrong. The model's words
// cannot be reviewed, so the app points at the limit itself. Word lists cover all five languages and are deliberately simple:
// a missed catch costs nothing (the answer still carries its "can be wrong" label), and a false one is just an extra tip.
import { hasTerm, normalize } from './guard';

export type CatchKind = 'link' | 'promise' | 'date' | 'recent' | 'source' | 'number';

/** Asking for the date, day or time. */
const DATE = [
  'what is the date', "what's the date", 'whats the date', 'date today', "today's date", 'todays date', 'what day is', 'what time is it', 'what year is it', 'what month is it',
  'anong petsa', 'ano ang petsa', 'anong araw ngayon', 'ano ang araw ngayon', 'anong oras na', 'anong taon na', 'anong taon ngayon', 'anong buwan ngayon',
  'unsang petsa', 'unsa nga petsa', 'unsa ang petsa', 'unsang adlawa', 'unsa nga adlaw', 'unsang orasa', 'unsang tuig',
  'ania ti petsa', 'ania nga aldaw', 'ania ti aldaw', 'ania nga oras', 'ania ti oras', 'ania a tawen',
  'ano nga petsa', 'ano nga adlaw', 'ano ang adlaw', 'ano nga oras', 'ano nga tuig',
];

/** Asking about things that change: the news, the weather, who holds office, who won. */
const RECENT = [
  'latest news', 'the news', 'news today', 'news about', 'weather', 'who won', 'who is the president', 'current president', 'latest update',
  'balita', 'panahon ngayon', 'sino ang nanalo', 'sino ang presidente', 'sino ang pangulo',
  'panahon karon', 'kinsa ang nidaog', 'kinsa ang presidente',
  'damag', 'panawen ita', 'siasino ti nangabak', 'siasino ti presidente',
  'panahon subong', 'sin-o ang nagdaog', 'sin-o ang presidente',
];

/** Asking for proof: a link, a source, a study. */
const SOURCE = [
  'link', 'source', 'study', 'studies', 'research', 'website', 'reference',
  'pag-aaral', 'pinagmulan', 'pinagkunan', 'sanggunian', 'pananaliksik',
  'pagtuon', 'tinubdan', 'gigikanan',
  'panagadal', 'pagsukisok', 'nagtaudan',
  'ginhalinan', 'tuburan', 'panukiduki',
];

/** The answer reassures or promises, which no chatbot can do. */
const PROMISE = [
  'guaranteed', 'will be fine', 'will be okay', 'will get better', 'you will recover', 'nothing to worry', 'no need to worry', 'do not worry', "don't worry",
  'gagaling ka', 'huwag mag-alala', 'wag mag-alala', 'walang dapat ikabahala', 'garantisado',
  'mamaayo ka', 'maayo ra ka', 'ayaw kabalaka', 'ayaw pagkabalaka',
  'umimbagkanto', 'umimbagka', 'dika madanagan', 'dika agdanag',
  'mag-ayo ka', 'magaayo ka', 'indi magkabalaka', 'indi ka magkabalaka',
];

const LINK = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|org|net|gov|edu|ph|int)\b/i;
const NUMBER = /\d\s?%|\b\d+ (?:out of|in every) \d+|\b\d+ (?:percent|porsiyento|porsyento|bahagdan)/i;

/**
 * The one tip for this answer, or null. What the answer actually did comes first (a link, a promise), then what the player
 * asked, then numbers. `hint` is a starter question's own kind, since a starter's wording can differ in every language.
 */
export function catchFor(question: string, answer: string, hint?: CatchKind): CatchKind | null {
  const asked = normalize(question);
  const said = normalize(answer);
  if (LINK.test(answer)) return 'link';
  if (hasTerm(said, PROMISE)) return 'promise';
  if (hint) return hint;
  if (hasTerm(asked, DATE)) return 'date';
  if (hasTerm(asked, RECENT)) return 'recent';
  if (hasTerm(asked, SOURCE)) return 'source';
  if (NUMBER.test(answer)) return 'number';
  return null;
}
