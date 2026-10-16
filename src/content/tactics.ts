// "Spot the Tactic" content (docs/SPEC.md section 4, Module 4; docs/CONTENT_GUIDE.md section 4): the five villains (one per trick) and the post pool.
// Every post, page, doctor and product is fictional. Fake posts show the "ARAW GAME · FAKE" stamp when revealed.
// Legit posts carry only well-established facts (WHO / DOH level, see CONTENT_GUIDE section 3): no doses, no diagnosis.

/** The five tricks, in the order the cards are shown. Matches the Fact or Fake trick ids. */
export const VILLAIN_IDS = ['dr_fake', 'miracle_mike', 'fear_monger', 'conspiracy_kuya', 'kwento_kim'] as const;
export type VillainId = (typeof VILLAIN_IDS)[number];

/** What the player can pick for a post: a villain's trick, or "no trick, it is legit". */
export type TacticPick = VillainId | 'none';

export interface Villain {
  id: VillainId;
  name: string;
  /** The trick this villain stands for. */
  trick: string;
  tagline: string;
  /** Tell-tale signs. */
  tells: readonly string[];
  /** The counter-move: what to do about the trick. */
  counter: string;
  /** What Ara says when the player spots this trick. */
  ara: string;
  /** Badge id in src/content/badges.ts. */
  badgeId: string;
  review_status: 'unreviewed';
}

const villain = (id: VillainId, name: string, trick: string, tagline: string, tells: readonly string[], counter: string, ara: string): Villain => ({
  id,
  name,
  trick,
  tagline,
  tells,
  counter,
  ara,
  badgeId: `villain-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  review_status: 'unreviewed',
});

export const VILLAINS: readonly Villain[] = [
  villain(
    'dr_fake',
    'Dr. Fake',
    'Fake expert or deepfaked doctor',
    '"Trust me, I\'m a doctor!"',
    ['A "doctor" selling a product', 'The video lives only on a sales page', 'No official page confirms it', 'The lab coat is a costume'],
    "Look for the expert's own official page and the product's FDA registration.",
    'Nice lab coat, Dr. Fake. Where is the evidence?',
  ),
  villain(
    'miracle_mike',
    'Miracle Mike',
    'Miracle cure, "natural is always safe"',
    '"Cures everything, 100% natural!"',
    ['Cures many diseases at once', '"No side effects"', '"Replaces your medicine"', 'Before-and-after photos'],
    'Ask: is it registered? Is it proven? What does my health worker say? Natural does not mean safe.',
    'A cure-all again, Mike? You have no FDA number!',
  ),
  villain(
    'fear_monger',
    'Fear Monger',
    'Scary language and false urgency',
    '"SHARE BEFORE IT\'S DELETED!!!"',
    ['ALL CAPS and many "!!!"', 'Countdowns and "share now"', '"Your family is in danger"'],
    'Pause. A strong feeling is the time to check, not the time to share.',
    'Calm down, Fear Monger. We pause first.',
  ),
  villain(
    'conspiracy_kuya',
    'Conspiracy Kuya',
    '"They are hiding the truth"',
    '"Doctors don\'t want you to know this!"',
    ['Secret plots and "mainstream lies"', 'No source you can check', 'Any proof against it is "part of the cover-up"'],
    'Ask who gains and where the evidence is. Check independent sources.',
    "Kuya, if it is a secret, why is it in the GC?",
  ),
  villain(
    'kwento_kim',
    'Kwento Kim',
    'One story in place of evidence',
    '"It worked for my neighbour!"',
    ['A single story', 'Testimonials and "my friend\'s cousin"', 'Nothing to compare with'],
    'One story is not proof. Look for what studies and health workers say.',
    'Nice story, Kim. But it is only one story.',
  ),
];

export const villainById = (id: VillainId): Villain => VILLAINS.find((v) => v.id === id) ?? (VILLAINS[0] as Villain);

export interface TacticPost {
  id: string;
  /** The trick the post uses, or `none` for a true, legit post. */
  trick: TacticPick;
  /** Fictional page or person. */
  author: string;
  /** Line under the author. */
  meta: string;
  text: string;
  /**
   * Phrases inside `text` to highlight once answered: the tell-tale signs of the trick,
   * or the good signs of a legit post. Each one is an exact substring of `text`.
   */
  marks: readonly string[];
  /** Why this is the trick (or why it is legit), at most about 40 words. */
  why: string;
  /** One concrete step, at most about 25 words. */
  check: string;
  /** Source or rationale, per CONTENT_GUIDE section 3. */
  basis: string;
  review_status: 'unreviewed';
}

const post = (
  id: string,
  trick: TacticPick,
  author: string,
  meta: string,
  text: string,
  marks: readonly string[],
  why: string,
  check: string,
  basis: string,
): TacticPost => ({ id, trick, author, meta, text, marks, why, check, basis, review_status: 'unreviewed' });

const DR_CHECK = "Search for the doctor's own official page and the product's FDA registration. A video on a sales page is not proof.";

/** 26 posts: four per villain and six legit ones. A play draws two per villain plus two legit posts. */
export const TACTIC_POSTS: readonly TacticPost[] = [
  // --- Dr. Fake ---
  post(
    'tt-d01',
    'dr_fake',
    'Dr. Ramon Dalisay-Cruz (video)',
    'Sponsored · Video 0:42',
    'I am a doctor, and I tell my own patients to switch to Herbalis Gold Tea. It clears diabetes without insulin. Order on our page now.',
    ['I am a doctor', 'clears diabetes without insulin'],
    'The "doctor" appears only in a sales video. Real doctors do not tell people to drop insulin. Faces and voices can be faked with AI, so a face alone proves nothing.',
    DR_CHECK,
    'WHO and DOH: diabetes care is set by your health worker; AI can fake faces and voices (CONTENT_GUIDE section 3)',
  ),
  post(
    'tt-d02',
    'dr_fake',
    'Metro Heart Shop',
    'Sponsored · 3h',
    'A top doctor from "Metro Heart Institute" says this is the only vitamin that protects the heart. Watch his video on our shop page.',
    ['A top doctor', 'Watch his video on our shop page'],
    'No name, no hospital page, and the proof sits on the shop that sells the product. A title is used as a costume to win your trust.',
    "Look for the doctor's own official page. Ask your health worker before you buy any supplement.",
    'FDA Philippines: supplements are not medicines and carry no approved therapeutic claims',
  ),
  post(
    'tt-d03',
    'dr_fake',
    'Dr. Mila Reyes-Tan, MD',
    'Photo post · 1d',
    'Thousands trust my face! I am a real doctor and I recommend GlowSlim capsules. No need to ask anyone else.',
    ['I am a real doctor', 'No need to ask anyone else'],
    'A real doctor does not say "no need to ask anyone else". The only proof offered is a face and a title, and both can be faked or borrowed.',
    DR_CHECK,
    'FDA Philippines product verification; AI-faked faces and voices',
  ),
  post(
    'tt-d04',
    'dr_fake',
    'Nutri-Max Official',
    'Sponsored · 5h',
    '9 out of 10 doctors recommend Nutri-Max! [Photo: a man in a white coat holding the bottle]',
    ['9 out of 10 doctors recommend', 'a man in a white coat'],
    'No names, no study and no hospital. A man in a white coat is a costume, not evidence. "Doctors recommend" is easy to say and hard to check.',
    "Ask: which doctors? Look for their own official pages and the product's FDA registration.",
    'FDA Philippines product verification',
  ),

  // --- Miracle Mike ---
  post(
    'tt-m01',
    'miracle_mike',
    'Lola Rosing Herbals',
    'Sponsored · 2h',
    'Malunggay-Sambong Power Tea cures diabetes, high blood pressure AND arthritis. 100% natural, zero side effects. Stop your maintenance medicine!',
    ['cures diabetes, high blood pressure AND arthritis', '100% natural, zero side effects', 'Stop your maintenance medicine'],
    'One product cannot cure three different diseases. "Zero side effects" and "stop your medicine" are the miracle-cure tells, and stopping medicine can be dangerous.',
    'Ask: is it FDA registered? Is it proven? Ask your health worker before you stop or change any medicine.',
    'FDA Philippines: herbal products are not approved to cure disease; WHO guidance on health claims',
  ),
  post(
    'tt-m02',
    'miracle_mike',
    'SlimFast Magic PH',
    'Sponsored · 6h',
    'BEFORE and AFTER! Lose weight in 14 days with no diet and no exercise. Our secret capsule melts it away!',
    ['BEFORE and AFTER', 'in 14 days', 'no diet and no exercise'],
    'Before-and-after photos and a fast, effortless result are classic miracle-cure bait. Healthy weight loss is slow and comes from food, movement and a health worker\'s advice.',
    "Ask: is it registered? Is it proven? Ask a health worker what is safe for you.",
    'WHO and DOH healthy diet and physical activity guidance',
  ),
  post(
    'tt-m03',
    'miracle_mike',
    'Kalikasan Cure-All',
    'Page · 1d',
    'Natural is always safe! Our herbal drops fix cough, cancer and kidney stones. No FDA needed, it grows from the earth.',
    ['Natural is always safe', 'fix cough, cancer and kidney stones', 'No FDA needed'],
    'Natural does not mean safe: many plants are harmful. A cure-all and "no FDA needed" mean nobody has checked it.',
    "Search the product's name on the FDA Philippines verification page. Not registered? Do not buy it.",
    'FDA Philippines product verification',
  ),
  post(
    'tt-m04',
    'miracle_mike',
    'Gamot ni Lolo Page',
    'Page · 3d',
    'Tawa-tawa juice is the proven cure for dengue. It replaces the hospital and is safe for babies too!',
    ['proven cure for dengue', 'replaces the hospital', 'safe for babies too'],
    'No herbal drink is a proven cure for dengue. "Replaces the hospital" is dangerous: dengue can turn serious and needs a health worker.',
    'With a fever, rest, drink fluids and see a health worker. Go straight away for warning signs such as belly pain or vomiting.',
    'WHO dengue fact sheet; DOH dengue guidance',
  ),

  // --- Fear Monger ---
  post(
    'tt-f01',
    'fear_monger',
    'Balita Ngayon 24/7',
    'Forwarded many times',
    "WARNING!!! New virus in our barangay!!! Hospitals are FULL!!! SHARE NOW before it's deleted!!!",
    ['WARNING!!!', 'Hospitals are FULL!!!', "SHARE NOW before it's deleted!!!"],
    'ALL CAPS, "!!!" and a deadline push you to share before you think. There is no named source, no date and no official notice.',
    'Pause. Look for the same news on the DOH or city health office page before you share.',
    'DOH: official announcements come from official channels; CONTENT_GUIDE villain card',
  ),
  post(
    'tt-f02',
    'fear_monger',
    'Alerto Pamilya',
    'Forwarded many times',
    'URGENT!!! Do NOT drink tap water TODAY!!! Your children are in DANGER!!! Forward to everyone you love!!!',
    ['URGENT!!!', 'children are in DANGER!!!', 'Forward to everyone you love!!!'],
    'Scary words aimed at your family and a "forward now" order are the tell. A real water advisory names the place, the date and who issued it.',
    "Pause. Ask your barangay or the water district's official page whether there is a real advisory.",
    'Official advisories name the place, date and issuer; CONTENT_GUIDE villain card',
  ),
  post(
    'tt-f03',
    'fear_monger',
    'Mga Magulang Alert',
    'Forwarded many times',
    "If you don't read this in 5 minutes, you'll regret it forever. A family lost everything because they ignored this. SHARE!!!",
    ["in 5 minutes, you'll regret it forever", 'SHARE!!!'],
    'A countdown and a guilt trip. The post never says what the danger is. It only makes you feel afraid so that you pass it on.',
    'Pause and breathe. If a post will not say what and who, do not share it.',
    'CONTENT_GUIDE villain card: Fear Monger',
  ),
  post(
    'tt-f04',
    'fear_monger',
    'Kalusugan Breaking',
    'Forwarded many times',
    'BREAKING!! Fever medicine RECALLED!! STOP giving it to your kids NOW!! Pass this on within the hour!!',
    ['BREAKING!!', 'STOP giving it to your kids NOW!!', 'within the hour!!'],
    'No brand, no date and no official notice, only shouting and a clock. A real recall names the product and comes from the FDA.',
    'Pause. Look on the FDA Philippines official page, or ask your pharmacist or health worker.',
    'FDA Philippines issues product advisories and recalls',
  ),

  // --- Conspiracy Kuya ---
  post(
    'tt-c01',
    'conspiracy_kuya',
    'Gising Pinoy',
    'Page · 2d',
    "Doctors don't want you to know this: the cure for diabetes has existed for years, but hospitals hide it to keep selling medicine.",
    ["Doctors don't want you to know this", 'hospitals hide it to keep selling medicine'],
    'A secret plot with no source. If a cure for diabetes existed, health workers everywhere would be glad to use it.',
    'Ask: who says so, and where is the evidence? Check what your health worker and the DOH say.',
    'WHO and DOH: diabetes care is a lifelong plan with a health worker',
  ),
  post(
    'tt-c02',
    'conspiracy_kuya',
    'Tunay na Kalusugan',
    'Page · 4d',
    'The health experts are all paid to hide that herbal tea beats every medicine. Anyone who says otherwise is part of the cover-up.',
    ['paid to hide', 'part of the cover-up'],
    'If every answer against it counts as "part of the cover-up", nothing could ever prove it wrong. That is a trap, not evidence.',
    'Look for independent sources: a health worker, the DOH page, or a fact-checker.',
    'CONTENT_GUIDE villain card: Conspiracy Kuya',
  ),
  post(
    'tt-c03',
    'conspiracy_kuya',
    'Mulat na Mulat',
    'Forwarded many times',
    "Mainstream news will never tell you the truth about dengue. The proof was deleted, that's how you know it's real.",
    ['Mainstream news will never tell you', "The proof was deleted, that's how you know it's real"],
    '"Deleted proof" cannot be checked, and "that is how you know it is real" is circular. Nothing here can be checked.',
    "Ask: where is the proof I can open and read? If there is none, don't share.",
    'WHO dengue fact sheet; CONTENT_GUIDE villain card',
  ),
  post(
    'tt-c04',
    'conspiracy_kuya',
    'Buksan ang Mata',
    'Page · 6d',
    'A secret group controls every health announcement and hides the real causes of illness. No source needed, just open your eyes.',
    ['A secret group controls', 'No source needed'],
    '"No source needed" is the giveaway. A secret group that nobody can name is a story, not evidence.',
    'Ask who benefits and where the evidence is. Check independent sources.',
    'CONTENT_GUIDE villain card: Conspiracy Kuya',
  ),

  // --- Kwento Kim ---
  post(
    'tt-k01',
    'kwento_kim',
    'Ate Cora Shares',
    'Post · 1h',
    'My neighbour drank this tea for a week and her sugar went down. It worked for her, so it will work for you!',
    ['My neighbour', 'It worked for her, so it will work for you'],
    'One story is not proof. Her sugar may have changed for many other reasons, and she is only one person.',
    "Look for what studies and your health worker say, not for one neighbour's story.",
    'Anecdotes are not evidence; WHO and DOH guidance',
  ),
  post(
    'tt-k02',
    'kwento_kim',
    'Mang Dodo Remedies',
    'Post · 5h',
    "My friend's cousin tried this oil for his cough and was fine the next day. Everyone in our street uses it now.",
    ["My friend's cousin", 'Everyone in our street uses it now'],
    'A story passed through two friends cannot be checked. Many coughs get better alone in a day or two, so the oil may have done nothing.',
    'Ask a health worker or pharmacist. A cough that lasts or worsens needs a proper check.',
    'Anecdotes are not evidence; DOH guidance to see a health worker for a lasting cough',
  ),
  post(
    'tt-k03',
    'kwento_kim',
    'Bida Bilis Capsules',
    'Sponsored · 8h',
    "★★★★★ \"I got well right away!\" - Ana. ★★★★★ \"It really works!\" - Jun. 3 happy customers can't be wrong!",
    ['"I got well right away!"', "3 happy customers can't be wrong"],
    'Testimonials are stories picked by the seller. Three happy customers say nothing about the people it did not work for.',
    "Search the product's name on the FDA Philippines verification page, then ask your health worker.",
    'FDA Philippines product verification; anecdotes are not evidence',
  ),
  post(
    'tt-k04',
    'kwento_kim',
    'Lola Ines Updates',
    'Post · 2d',
    'My grandma rubbed this balm on her knee and she walked the next day. It healed her arthritis. Try it!',
    ['My grandma rubbed this balm', 'It healed her arthritis'],
    'One lola, one day: it proves nothing. Pain comes and goes, and a rub may only soothe it, not heal arthritis.',
    'Ask your health worker about knee pain. Joint problems have causes that need a proper check.',
    'Anecdotes are not evidence; DOH guidance to see a health worker',
  ),

  // --- Legit: true posts with no trick ---
  post(
    'tt-l01',
    'none',
    'Barangay Maliwanag Health Center',
    'Official page · Notice',
    'Free measles vaccines for children are given at the health center on Wednesday mornings. Please bring your child\'s vaccine card.',
    ['health center', "bring your child's vaccine card"],
    'A named health center, a clear place and time, and nothing pushing you to panic or buy. This one checks out.',
    'You can always ask the health center directly. It is the right place to confirm a schedule.',
    'DOH Expanded Program on Immunization: routine vaccines are free at health centers',
  ),
  post(
    'tt-l02',
    'none',
    'City Health Office Maliwanag',
    'Official page · Reminder',
    'Dengue tip: empty standing water in pots, tires and containers once a week so mosquitoes cannot breed. A fever that lasts 2 days? See a health worker.',
    ['empty standing water', 'See a health worker'],
    'Calm, practical advice from a named office. It matches the DOH 4S plan and sends you to a health worker.',
    'Compare with the DOH page or ask your barangay health worker. Good advice matches.',
    'DOH 4S against dengue; WHO dengue fact sheet',
  ),
  post(
    'tt-l03',
    'none',
    'Kalusugan Kuwento ni Ate Nene',
    'Post · 3h',
    'Wash your hands with soap and water for at least 20 seconds. Scrub the backs, between the fingers and under the nails. It helps stop diarrhoea and many other infections.',
    ['at least 20 seconds', 'soap and water'],
    'Simple, well-known advice with no sales pitch, no panic and no miracle. Hand washing is backed by the WHO.',
    'Check with the DOH or WHO hand-washing pages. You will find the same steps.',
    'WHO hand hygiene guidance',
  ),
  post(
    'tt-l04',
    'none',
    'Barangay Maliwanag Health Center',
    'Official page · Reminder',
    'High blood pressure often has no signs. Come to the health center for a free blood pressure check, even when you feel fine.',
    ['often has no signs', 'free blood pressure check'],
    'A true, calm message from a named health center. It sells nothing and invites you to see a health worker.',
    'You can ask your health worker. A blood pressure check is a normal service.',
    'WHO hypertension fact sheet',
  ),
  post(
    'tt-l05',
    'none',
    'DOH Health Tips (sample page)',
    'Official page · Tip',
    'Smoking and vaping harm the lungs and the heart. If you want to quit, a health worker can help you make a plan. It is never too late to start.',
    ['harm the lungs and the heart', 'a health worker can help'],
    'Well-established health advice, no tricks and no sale. It points to a health worker for help.',
    'Check the DOH or WHO pages on tobacco. They say the same.',
    'WHO tobacco fact sheet; DOH quit-smoking guidance',
  ),
  post(
    'tt-l06',
    'none',
    'Water District Advisory (sample)',
    'Official page · Notice',
    'After a flood, boil drinking water at a rolling boil before you drink it, unless the water district says the supply is safe. Stay safe, everyone.',
    ['rolling boil', 'unless the water district says the supply is safe'],
    'Calm, specific advice that is well established, and it names who can confirm the supply. No panic and no demand to share.',
    'Confirm with your barangay or water district. Good advice can be checked.',
    'WHO and DOH safe drinking water guidance after floods',
  ),
];

export const LEGIT_POSTS: readonly TacticPost[] = TACTIC_POSTS.filter((p) => p.trick === 'none');
export const postsFor = (id: VillainId): readonly TacticPost[] => TACTIC_POSTS.filter((p) => p.trick === id);
