// A real, tiny naive Bayes text classifier for "Turuan si AI" (docs/SPEC.md section 4, Module 2). No UI, no randomness:
// the same examples always give the same detector, so it is fully unit-tested. It only ever knows the words it was taught.
export type Label = 'fake' | 'real';

export interface Example {
  text: string;
  label: Label;
}

/** Counts per class. Words are counted every time they appear (multinomial naive Bayes). */
export interface Model {
  docs: Record<Label, number>;
  words: Record<Label, Readonly<Record<string, number>>>;
  /** Total word count per class. */
  total: Record<Label, number>;
  /** Number of different words the detector has seen. */
  vocab: number;
}

/** Very common English words carry no signal; ignoring them keeps the highlighted "why" words meaningful. */
const STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'is',
  'to',
  'of',
  'and',
  'in',
  'for',
  'on',
  'it',
  'this',
  'that',
  'are',
  'be',
  'with',
  'at',
  'by',
  'as',
  'from',
  'you',
  'your',
  'we',
  'our',
  'has',
  'have',
  'will',
  'can',
  'an',
  'or',
  'if',
  'so',
  'do',
  'no',
  'not',
  'all',
  'only',
]);

/** Splits text into words and the gaps between them, so a UI can show the original text word by word. */
export const WORD_SPLIT = /([\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)/u;

/** The token a word becomes, or null when the detector ignores it (too short, or a stopword). */
export function toToken(word: string): string | null {
  const w = word.toLowerCase();
  return w.length < 2 || STOPWORDS.has(w) ? null : w;
}

/** The words of a text as written, in order (splitting on a capture group puts the words at the odd positions). */
export const wordsOf = (text: string): string[] => text.split(WORD_SPLIT).filter((_, i) => i % 2 === 1);

/** Lowercase word tokens, in order, repeats kept. */
export function tokenize(text: string): string[] {
  return wordsOf(text).flatMap((w) => toToken(w) ?? []);
}

export const emptyModel = (): Model => ({
  docs: { fake: 0, real: 0 },
  words: { fake: {}, real: {} },
  total: { fake: 0, real: 0 },
  vocab: 0,
});

/** Train from scratch on the examples (the player's labels). Order never matters. */
export function train(examples: readonly Example[]): Model {
  const docs: Record<Label, number> = { fake: 0, real: 0 };
  const words: Record<Label, Record<string, number>> = { fake: {}, real: {} };
  const total: Record<Label, number> = { fake: 0, real: 0 };
  const seen = new Set<string>();
  for (const { text, label } of examples) {
    docs[label] += 1;
    for (const token of tokenize(text)) {
      words[label][token] = (words[label][token] ?? 0) + 1;
      total[label] += 1;
      seen.add(token);
    }
  }
  return { docs, words, total, vocab: seen.size };
}

/** True when the detector has seen the word in at least one example. */
export const knows = (model: Model, token: string): boolean => token in model.words.fake || token in model.words.real;

/**
 * How much one occurrence of a word pushes the verdict, as a log ratio: above 0 leans Fake, below 0 leans Real.
 * Laplace smoothing (+1) keeps a word seen in only one class from being absolute. Unknown words weigh 0.
 */
export function weightOf(model: Model, token: string): number {
  if (!knows(model, token)) return 0;
  const pFake = ((model.words.fake[token] ?? 0) + 1) / (model.total.fake + model.vocab);
  const pReal = ((model.words.real[token] ?? 0) + 1) / (model.total.real + model.vocab);
  return Math.log(pFake / pReal);
}

export interface WordInfo {
  /** The word as written in the post. */
  word: string;
  token: string;
  known: boolean;
  weight: number;
}

export interface Prediction {
  label: Label;
  /** Chance of Fake, 0 to 1. */
  pFake: number;
  /** How sure the detector is of its label, 0.5 to 1. A coin flip is 0.5. */
  confidence: number;
  /** Every word the detector looked at, in order. */
  words: WordInfo[];
  /** How many of those words it had never seen. */
  unknown: number;
}

/** The detector's verdict. With no evidence either way (a tie) it says Real: it never accuses without a reason. */
export function classify(model: Model, text: string): Prediction {
  const prior = (label: Label): number => Math.log((model.docs[label] + 1) / (model.docs.fake + model.docs.real + 2));
  const words: WordInfo[] = [];
  let logOdds = prior('fake') - prior('real'); // log P(fake)/P(real)
  for (const word of wordsOf(text)) {
    const token = toToken(word);
    if (!token) continue;
    const weight = weightOf(model, token);
    logOdds += weight;
    words.push({ word, token, known: knows(model, token), weight });
  }
  const pFake = 1 / (1 + Math.exp(-logOdds));
  const label: Label = logOdds > 1e-9 ? 'fake' : 'real';
  return {
    label,
    pFake,
    confidence: label === 'fake' ? pFake : 1 - pFake,
    words,
    unknown: words.filter((w) => !w.known).length,
  };
}

/**
 * The words the detector relied on: the known words with the biggest push either way, strongest first.
 * Each distinct word is listed once.
 */
export function reliedOn(prediction: Prediction, limit = 3): WordInfo[] {
  const best = new Map<string, WordInfo>();
  for (const w of prediction.words) {
    if (w.known && Math.abs(w.weight) > 1e-9 && !best.has(w.token)) best.set(w.token, w);
  }
  return [...best.values()]
    .sort((a, b) => {
      const diff = Math.abs(b.weight) - Math.abs(a.weight);
      return Math.abs(diff) > 1e-9 ? diff : a.token.localeCompare(b.token); // ties by word, so the order never depends on rounding
    })
    .slice(0, limit);
}

/** Share of examples the detector gets right, 0 to 1. */
export function accuracy(model: Model, examples: readonly Example[]): number {
  if (examples.length === 0) return 0;
  return examples.filter((e) => classify(model, e.text).label === e.label).length / examples.length;
}

/** Whole percent for display. */
export const percent = (x: number): number => Math.round(x * 100);
