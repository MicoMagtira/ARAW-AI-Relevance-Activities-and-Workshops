// Library: Ara's Diksyunaryo, docs/SPEC.md section 8 and docs/CONTENT_GUIDE.md section 6.
// Each term: a one-line meaning (at most 15 words), a funny Filipino example ("Halimbawa: ...") and the module it is seen in.
// Jokes are about everyday situations and the villains, never about age, body, region, religion or belief.
import type { ModuleTag } from '../factOrFake/schema';

export interface GlossaryTerm {
  id: string;
  term: string;
  /** One-line plain meaning, at most 15 words. */
  meaning: string;
  /** Starts with "Halimbawa: ". */
  example: string;
  /** "Seen in Module X". */
  module: ModuleTag;
  review_status: 'unreviewed';
}

const term = (id: string, name: string, module: ModuleTag, meaning: string, example: string): GlossaryTerm => ({
  id,
  term: name,
  meaning,
  example: `Halimbawa: ${example}`,
  module,
  review_status: 'unreviewed',
});

/** Sorted A to Z by term. */
export const GLOSSARY: readonly GlossaryTerm[] = [
  term('accessibility', 'Accessibility', 'm09', 'Designing so people with disabilities or low vision can use it too.',
    'The kiosk adds big letters and a voice, so Lola reads it before Kuya Jun can even say "Tulungan ko po kayo?"'),
  term('accountability', 'Accountability', 'm10', 'Who must answer and fix things when an AI system causes harm.',
    '"The AI did it" is not an answer. The company that used it must explain and fix it.'),
  term('ai', 'AI (Artificial Intelligence)', 'm01', 'Computer systems that learn patterns from many examples to make guesses.',
    'Your phone keyboard guesses "Salamat po" after you type "Sala". Not magic, just patterns.'),
  term('ai-companion', 'AI companion', 'm08', 'A chatbot app built to feel like a friend. It is a product.',
    'The app says "I miss you!" at 2 AM. Sweet, pero it misses your attention, not you.'),
  term('ai-label', 'AI label', 'm07', 'A note saying a picture, text or video was made with AI.',
    'Bea writes "Made with AI" on her poster, so nobody thinks Lola really rode a giant mango.'),
  term('algorithm', 'Algorithm', 'm01', 'A step-by-step recipe a computer follows to do a task.',
    'Like Tita\'s adobo recipe: same steps every time. Pero the computer never sneaks in extra garlic.'),
  term('automation-bias', 'Automation bias', 'm06', 'Trusting a machine too much, even when your own eyes say otherwise.',
    'The map app says "turn left" into the river. Kuya Jun stops the tricycle. Good call, Kuya.'),
  term('bias', 'Bias', 'm02', 'When AI treats some people unfairly because its examples were lopsided.',
    'An AI trained only on Manila photos thinks every jeepney is in Cubao. Sayang, the rest of the country.'),
  term('bot', 'Bot', 'm05', 'An account run by a program, not a real person, often posting nonstop.',
    '"Kuya Benjie" comments 300 times a day and never sleeps. Bot yan, hindi kuya.'),
  term('chatbot', 'Chatbot', 'm03', 'A program you type or talk to that answers in sentences.',
    'Bea asks the chatbot for a pancit recipe, and it adds pineapple. Bold choice, chatbot.'),
  term('clickbait', 'Clickbait', 'm04', 'A shocking title made to get clicks, not to inform.',
    '"You won\'t BELIEVE what this tea did to Lola!" Spoiler: she just drank it.'),
  term('consent', 'Consent', 'm07', 'Asking permission before using someone\'s face, voice, words or data.',
    'Bea asks, "Kuya Jun, okay lang po ba to use your photo?" before posting. Respect!'),
  term('content-filter', 'Content filter', 'm02', 'An AI that tries to catch harmful or false posts before you see them.',
    'The filter learned mostly English posts, so a Taglish fake slipped by like a cat under the gate.'),
  term('data-breach', 'Data breach', 'm10', 'When personal data leaks out to people who should not have it.',
    'The tea app leaked buyers\' addresses. Now the only thing "detoxed" is everyone\'s privacy.'),
  term('data-privacy', 'Data privacy', 'm10', 'Your right to control who collects, uses and shares your personal information.',
    'Lola\'s blood pressure log is hers. Not the tea seller\'s, not the whole GC\'s.'),
  term('data-privacy-act', 'Data Privacy Act', 'm10', 'The Philippine law (RA 10173) that protects your personal data rights.',
    'Tita asks the company, "What data do you have on me?" The law says they must answer.'),
  term('deepfake', 'Deepfake', 'm04', 'A fake video, photo or voice made with AI to look real.',
    'A "doctor" video selling Miracle Tea Max, but the real doctor was at a binyag that day.'),
  term('disinformation', 'Disinformation', 'm04', 'False information spread on purpose, to trick people or make money.',
    'A seller posts fake cure stories to sell more tea. Same trick, every payday.'),
  term('fact-check', 'Fact-check', 'm05', 'Checking a claim against trusted sources before believing or sharing it.',
    'Before forwarding "Kalamansi cures everything!", Tita searches a fact-checker. Ayan, detective Tita!'),
  term('feed', 'Feed', 'm08', 'The endless list of posts an app picks to show you.',
    'You open the app for one recipe. 2 hours later you know everything about a stranger\'s cat.'),
  term('generative-ai', 'Generative AI', 'm07', 'AI that makes new text, pictures, music or voices from patterns.',
    'Bea types "Lola as a superhero" and gets Super Lola with a walis tingting cape.'),
  term('hallucination', 'Hallucination', 'm02', 'When AI confidently makes up something that is not true.',
    'The chatbot says the Philippines has 9,000 provinces. Very sure, very wrong.'),
  term('human-in-the-loop', 'Human in the loop', 'm06', 'A person checks and decides before AI output is used.',
    'AI drafts the dengue leaflet; Kuya Jun reads it, fixes it, then signs it.'),
  term('inclusive-design', 'Inclusive design', 'm09', 'Building tech with many kinds of users in mind from the start.',
    'The new kiosk speaks Tagalog, Bisaya and Ilocano. Now Lolo Andoy can order his check-up too.'),
  term('machine-learning', 'Machine learning', 'm01', 'How computers learn patterns from lots of examples instead of fixed rules.',
    'Show a program 10,000 mango photos and it learns "mango". Show it one atis and it panics.'),
  term('misinformation', 'Misinformation', 'm04', 'False or misleading information, often shared by people who believe it.',
    'Tita forwards a wrong health tip with three praying hands. Pure love, wrong info.'),
  term('personal-data', 'Personal data', 'm03', 'Information that can identify you, like your name, address or ID numbers.',
    'Bea asks the chatbot about headaches, without typing her full name, school and birthday. Galing!'),
  term('phishing', 'Phishing', 'm10', 'A fake message that tricks you into giving passwords, codes or money.',
    '"Congrats! You won a ref! Send your OTP." Lola: "Wala nga akong sinalihang raffle."'),
  term('prompt', 'Prompt', 'm07', 'The instruction or question you type to tell an AI what to do.',
    '"Explain dengue to Lola, short and in Tagalog." A clear prompt, like a clear order at the carinderia.'),
  term('recommendation', 'Recommendation', 'm08', 'What an app suggests next, based on what you clicked before.',
    'You watched one lechon video. Now the app thinks lechon is your whole personality.'),
  term('source', 'Source', 'm05', 'Where information really comes from: who said it first.',
    '"Sabi ng kapitbahay ng pinsan ng kumare ko" is not a source. The DOH page is.'),
  term('training-data', 'Training data', 'm02', 'The examples an AI learns from before it starts guessing.',
    'Teach an AI only with photos of white rice, and it calls java rice "sick rice".'),
  term('troll', 'Troll', 'm05', 'Someone who posts to start fights or spread confusion on purpose.',
    'A troll comments "FAKE!" on a hand-washing reminder. Sabon lang po, hindi conspiracy.'),
  term('viral', 'Viral', 'm05', 'Shared so fast and so widely that it seems to be everywhere.',
    'A dancing-lola video goes viral overnight. Lola: "Ako ba yan? Ang galing ko pala!"'),
  term('voice-clone', 'Voice clone', 'm07', 'AI that copies someone\'s voice from a short recording.',
    '"Anak, send money now!" sounds like Tito, but Tito is asleep beside you. Ask the secret family question.'),
];

export const glossaryById = (id: string): GlossaryTerm | undefined => GLOSSARY.find((g) => g.id === id);
