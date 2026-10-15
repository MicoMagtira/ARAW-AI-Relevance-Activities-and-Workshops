// "AI or Not?" card pool (docs/SPEC.md section 4, Module 1). Everyday things only; every entry is fictional or generic.
// Hype cards ("AI-powered" stickers) count as Not AI and get the "Hype alert!" explanation.
export type AonKind = 'ai' | 'not-ai' | 'hype';

/** The two answers a player can give. */
export type AonAnswer = 'ai' | 'not-ai';

export interface AonItem {
  id: string;
  /** Short name shown big on the card. */
  name: string;
  /** One line about what it does, so the player knows what they are judging. */
  detail: string;
  kind: AonKind;
  /** One-line why, shown right after the answer. Hype cards start with "Hype alert!". */
  why: string;
  /** Hype cards only: the sticker printed on the card. */
  sticker?: string;
  review_status: 'unreviewed';
}

const ai = (id: string, name: string, detail: string, why: string): AonItem => ({ id, name, detail, kind: 'ai', why, review_status: 'unreviewed' });
const not = (id: string, name: string, detail: string, why: string): AonItem => ({ id, name, detail, kind: 'not-ai', why, review_status: 'unreviewed' });
const hype = (id: string, name: string, sticker: string, detail: string, why: string): AonItem => ({ id, name, detail, kind: 'hype', why, sticker, review_status: 'unreviewed' });

export const AON_POOL: readonly AonItem[] = [
  ai('aon-feed', 'Social media feed', 'Picks which posts to show you first.', 'It learned from what millions of people liked and watched, then guesses what you will tap.'),
  ai('aon-filter', 'Face filter', 'Puts puppy ears on your selfie.', 'It learned from many face photos where eyes and noses are, even when you move.'),
  ai('aon-symptom', 'Symptom-checker app', 'You type how you feel and it suggests what it might be.', 'It guesses from patterns in past cases. It is only a guess, so a health worker decides.'),
  ai('aon-maps', 'Maps traffic guess', 'Says your trip will take 20 minutes.', 'It guesses from patterns in past traffic. A guess, not a promise.'),
  ai('aon-spam', 'Spam filter', 'Moves junk email to a separate folder.', 'It learned from many junk and normal messages what spam usually looks like.'),
  ai('aon-voice', 'Voice assistant', 'You say "call Nanay" and it dials.', 'It learned from many recorded voices how to turn sound into words.'),
  ai('aon-album', 'Photo app that groups faces', 'Puts every photo of Lola in one album.', 'It learned to match faces from many examples.'),
  ai('aon-captions', 'Auto-captions on a video', 'Words appear on screen as people talk.', 'It learned from hours of speech to guess the words, and sometimes guesses wrong.'),
  ai('aon-translate', 'Translation app', 'Turns Tagalog into English as you type.', 'It learned patterns from huge amounts of text that was already translated.'),
  ai('aon-shop', '"You may also like" list', 'Suggests things after you buy something.', 'It guesses from patterns in what other shoppers bought together.'),
  ai('aon-fraud', 'Bank alert for odd card use', 'Texts you when a payment looks strange.', 'It learned what normal spending looks like and flags what does not fit.'),
  ai('aon-chatbot', 'Chatbot that writes its own replies', 'Answers questions you type in a chat box.', 'It learned patterns from lots of text and guesses the next words. It can sound sure and still be wrong.'),
  ai('aon-keyboard', 'Phone keyboard suggestions', 'Offers the next word as you type.', 'It learned which words usually follow each other.'),
  ai('aon-xray', 'X-ray reading helper', 'Marks spots on an X-ray for a doctor to check.', 'It learned from many X-rays. It helps, but the doctor decides.'),

  not('aon-calculator', 'Pocket calculator', 'Adds, subtracts and multiplies.', 'It follows fixed rules. Same input, same answer, no learning.'),
  not('aon-rice', 'Rice-cooker timer', 'Cooks for 30 minutes, then clicks off.', 'A fixed countdown. It does not guess anything.'),
  not('aon-switch', 'Light switch', 'On or off.', 'Nothing is guessed. You flip it and it obeys.'),
  not('aon-remote', 'TV remote', 'Changes the channel when you press a button.', 'Each button sends one fixed signal. Nothing is learned.'),
  not('aon-alarm', 'Alarm clock', 'Rings at 6:00 every morning.', 'It rings at the time you set. No patterns, no guessing.'),
  not('aon-fan', 'Three-speed electric fan', 'Low, medium or high.', 'A switch picks a fixed speed. The fan does not decide anything.'),
  not('aon-traffic', 'Traffic light on a timer', 'Changes colour every 60 seconds.', 'It follows a fixed schedule and does not look at the traffic.'),
  not('aon-thermo', 'Digital thermometer', 'Shows your body temperature.', 'A sensor measures and shows the number. It is not guessing from patterns.'),
  not('aon-doorbell', 'Doorbell', 'Rings when someone presses it.', 'Press, ring. A fixed rule with nothing to learn.'),
  not('aon-flashlight', 'Flashlight', 'Shines when you slide the switch.', 'A battery, a bulb and a switch. No learning inside.'),

  hype('aon-tea', 'Herbal tea', 'AI-powered!', 'The box says it "cleans your blood" with an AI-made formula.', 'Hype alert! "AI-powered" is a sticker, not proof. It is tea in a bag, and no tea cleans your blood.'),
  hype('aon-gummies', 'Vitamin gummies', 'AI-formulated!', 'The label says AI picked the perfect formula for you.', 'Hype alert! Every buyer gets the same gummy. Nothing inside learns about you.'),
  hype('aon-bracelet', 'Energy bracelet', 'Powered by AI!', 'An ad says it balances your energy using AI.', 'Hype alert! It is a plain bracelet with no learning inside. A sticker does not make it AI.'),
  hype('aon-pill', 'Sugar-lowering pill', 'AI-powered!', 'A post says it lowers blood sugar in three days.', 'Hype alert! Adding "AI" proves nothing. Check the FDA and ask a health worker first.'),
];

/** The correct answer for a card. Hype counts as Not AI. */
export const answerFor = (item: AonItem): AonAnswer => (item.kind === 'ai' ? 'ai' : 'not-ai');

export interface AonPoolIssue {
  id: string;
  problem: string;
}

/** Checks the pool is well formed: unique ids, short text, hype cards carry a sticker and the "Hype alert!" opener. */
export function validatePool(pool: readonly AonItem[] = AON_POOL): AonPoolIssue[] {
  const issues: AonPoolIssue[] = [];
  const seen = new Set<string>();
  for (const item of pool) {
    const bad = (problem: string) => issues.push({ id: item.id, problem });
    if (seen.has(item.id)) bad('duplicate id');
    seen.add(item.id);
    if (!item.name.trim() || !item.detail.trim() || !item.why.trim()) bad('empty text');
    if (item.why.split(/\s+/).length > 30) bad('why is longer than one line');
    if (item.kind === 'hype' && (!item.sticker || !item.why.startsWith('Hype alert!'))) bad('hype card needs a sticker and "Hype alert!"');
    if (item.kind !== 'hype' && (item.sticker || item.why.startsWith('Hype alert!'))) bad('only hype cards get a sticker or "Hype alert!"');
  }
  return issues;
}
