// The part bank for Gawa Ko 'To!: the five picture parts, and eight health-drive topics with slogans and facts.
// All people are fictional. Health facts are general, well-established WHO/DOH-level advice: no dosing, no diagnosis.

export type PictureId = 'ai' | 'stock' | 'neighbor' | 'artist' | 'ai-doctor';

export interface Picture {
  id: PictureId;
  name: string;
  /** One plain line under the name. */
  hint: string;
  /** Text alternative for the picture on the poster. */
  alt: string;
}

export const NEIGHBOR = 'Mang Rey';
export const ARTIST = 'Ate Dani';
export const DOCTOR = 'Dr. Lim';
export const PLACE = 'Barangay Masagana';

export const PICTURES: readonly Picture[] = [
  { id: 'ai', name: 'AI-generated picture', hint: 'Made in seconds by an AI tool, from patterns in many artists’ work.', alt: 'An AI-generated picture' },
  { id: 'stock', name: 'Stock photo', hint: 'A licensed photo from a library. Free to use, and no one to ask.', alt: 'A stock photo of a family' },
  { id: 'neighbor', name: `${NEIGHBOR}’s photo`, hint: 'Your neighbour, smiling at the health center. A real person’s face.', alt: `A photo of ${NEIGHBOR}, a neighbour` },
  { id: 'artist', name: `${ARTIST}’s drawing`, hint: 'An illustration by a local artist. Her work, her name.', alt: `A drawing by the artist ${ARTIST}` },
  { id: 'ai-doctor', name: `AI picture of ${DOCTOR}`, hint: 'A made-up photo of a real doctor, holding a product.', alt: `An AI-made picture of ${DOCTOR} holding a product` },
];

export type Motif = 'mosquito' | 'drop' | 'syringe' | 'heart' | 'lungs' | 'paw' | 'baby';

export interface Slogan {
  id: string;
  text: string;
  /** Written by the AI tool: it needs the "Made with AI" label too. */
  ai: boolean;
}

export interface Fact {
  id: string;
  text: string;
  ok: boolean;
  /** Why it is true, or what is wrong with it. */
  why: string;
}

export interface Topic {
  id: string;
  /** Poster heading, upper case, 24 characters at most. */
  title: string;
  /** What the brief asks for. */
  ask: string;
  motif: Motif;
  /** Where the facts come from (every fact-bearing game item names its basis). */
  basis: string;
  slogans: readonly Slogan[];
  facts: readonly Fact[];
}

export const TOPICS: readonly Topic[] = [
  {
    id: 'dengue',
    title: 'DENGUE PREVENTION',
    ask: 'a dengue-prevention poster',
    motif: 'mosquito',
    basis: 'DOH and WHO dengue guidance: mosquitoes breed in standing water; see a health worker for a lasting fever.',
    slogans: [
      { id: 'dengue-s1', text: 'Walang tubig, walang lamok!', ai: false },
      { id: 'dengue-s2', text: 'Tuyo ang paligid, ligtas ang pamilya!', ai: false },
      { id: 'dengue-s3', text: 'Stop the sting, empty the thing!', ai: true },
    ],
    facts: [
      { id: 'dengue-f1', text: 'Empty standing water every week. Mosquitoes breed in it.', ok: true, why: 'Mosquitoes lay eggs in standing water, so emptying it every week breaks the cycle.' },
      { id: 'dengue-f2', text: 'A fever that will not go away? See a health worker early.', ok: true, why: 'Early care matters in dengue, and only a health worker can tell what is wrong.' },
      { id: 'dengue-f3', text: 'Papaya leaf juice cures dengue.', ok: false, why: 'No home drink cures dengue. People with a fever should see a health worker.' },
      { id: 'dengue-f4', text: 'Dengue spreads when people cough or sneeze.', ok: false, why: 'Dengue spreads by mosquito bites, not by coughs or sneezes.' },
    ],
  },
  {
    id: 'hands',
    title: 'HANDWASHING WEEK',
    ask: 'a handwashing poster',
    motif: 'drop',
    basis: 'WHO and DOH hand hygiene guidance: soap, clean water and about 20 seconds, at key moments.',
    slogans: [
      { id: 'hands-s1', text: 'Sabon at tubig, laging handa!', ai: false },
      { id: 'hands-s2', text: 'Malinis na kamay, malusog na bayan!', ai: false },
      { id: 'hands-s3', text: 'Scrub, rinse, repeat, stay neat!', ai: true },
    ],
    facts: [
      { id: 'hands-f1', text: 'Wash hands with soap and clean water for at least 20 seconds.', ok: true, why: 'Soap and about 20 seconds of scrubbing lift germs off your skin.' },
      { id: 'hands-f2', text: 'Wash before eating and after using the toilet.', ok: true, why: 'These are the moments when germs most easily travel from hands to mouths.' },
      { id: 'hands-f3', text: 'Wash only if your hands look dirty.', ok: false, why: 'Germs are too small to see. Wash at the key moments even when hands look clean.' },
      { id: 'hands-f4', text: 'Cold water cannot clean hands. Only hot water works.', ok: false, why: 'Soap and scrubbing do the work. Clean cold water is fine.' },
    ],
  },
  {
    id: 'vaccine',
    title: 'VACCINATION DAY',
    ask: 'a vaccination-day poster',
    motif: 'syringe',
    basis: 'DOH Expanded Program on Immunization and WHO: routine child vaccines are free at health centers and do not cause the disease.',
    slogans: [
      { id: 'vaccine-s1', text: 'Bakuna ngayon, bata’y protektado!', ai: false },
      { id: 'vaccine-s2', text: 'Dalhin ang baby, libre sa health center!', ai: false },
      { id: 'vaccine-s3', text: 'A small shot, a big shield!', ai: true },
    ],
    facts: [
      { id: 'vaccine-f1', text: 'Routine childhood vaccines are free at the barangay health center.', ok: true, why: 'The government immunization program gives routine vaccines for children at health centers.' },
      { id: 'vaccine-f2', text: 'Bring your child’s vaccine card so the health worker can check what is due.', ok: true, why: 'The card shows which vaccines were given, so nothing is missed.' },
      { id: 'vaccine-f3', text: 'Vaccines give children the very disease they protect against.', ok: false, why: 'Vaccines train the body to fight a disease. They do not cause the disease.' },
      { id: 'vaccine-f4', text: 'One shot as a baby protects against everything for life.', ok: false, why: 'Different vaccines need different doses and timing. Ask the health worker.' },
    ],
  },
  {
    id: 'bp',
    title: 'CHECK YOUR BP',
    ask: 'a blood-pressure check poster',
    motif: 'heart',
    basis: 'DOH and WHO hypertension guidance: high blood pressure often has no signs, and too much salt raises it.',
    slogans: [
      { id: 'bp-s1', text: 'Presyon mo, alamin mo!', ai: false },
      { id: 'bp-s2', text: 'Libreng check-up, kalusugan ang premyo!', ai: false },
      { id: 'bp-s3', text: 'Know your number, love your heart!', ai: true },
    ],
    facts: [
      { id: 'bp-f1', text: 'Get your blood pressure checked often, even when you feel fine.', ok: true, why: 'High blood pressure often has no signs, so a check is the only way to know.' },
      { id: 'bp-f2', text: 'Too much salt can raise blood pressure over time.', ok: true, why: 'Eating less salt is a well-known way to help keep blood pressure down.' },
      { id: 'bp-f3', text: 'No headache means your blood pressure is fine.', ok: false, why: 'High blood pressure often feels like nothing at all. Get it checked.' },
      { id: 'bp-f4', text: 'Only old people can have high blood pressure.', ok: false, why: 'Younger adults can have it too. Everyone can get a check.' },
    ],
  },
  {
    id: 'tb',
    title: 'COUGH CHECK',
    ask: 'a cough-check poster',
    motif: 'lungs',
    basis: 'DOH and WHO tuberculosis guidance: a cough of two weeks or more needs a check; TB is curable with full treatment.',
    slogans: [
      { id: 'tb-s1', text: 'Ubo ng dalawang linggo? Magpa-check!', ai: false },
      { id: 'tb-s2', text: 'Ang TB ay nagagamot!', ai: false },
      { id: 'tb-s3', text: 'Breathe easy, get checked today!', ai: true },
    ],
    facts: [
      { id: 'tb-f1', text: 'A cough lasting two weeks or more should be checked at the health center.', ok: true, why: 'A long cough can be a sign of TB or something else. A health worker can check.' },
      { id: 'tb-f2', text: 'TB can be cured when treatment is taken all the way to the end.', ok: true, why: 'TB is curable, but only when the full treatment is finished.' },
      { id: 'tb-f3', text: 'A cough that lasts for weeks is normal and will pass.', ok: false, why: 'A cough that lasts for weeks should be checked, not waited out.' },
      { id: 'tb-f4', text: 'You catch TB by sharing a spoon or a plate.', ok: false, why: 'TB spreads through the air when a sick person coughs, not through plates.' },
    ],
  },
  {
    id: 'water',
    title: 'SAFE WATER',
    ask: 'a safe-drinking-water poster',
    motif: 'drop',
    basis: 'WHO and DOH safe water guidance: clear water can still carry germs; boil or treat it and store it covered.',
    slogans: [
      { id: 'water-s1', text: 'Pakuluan muna, bago inumin!', ai: false },
      { id: 'water-s2', text: 'Malinis na tubig, malusog na tahanan!', ai: false },
      { id: 'water-s3', text: 'Boil it, cover it, sip it safe!', ai: true },
    ],
    facts: [
      { id: 'water-f1', text: 'Boil drinking water, or treat it, when you are not sure it is safe.', ok: true, why: 'Boiling kills the germs that cause stomach illness.' },
      { id: 'water-f2', text: 'Keep drinking water in a clean, covered container.', ok: true, why: 'A cover keeps dirt, insects and dirty hands out.' },
      { id: 'water-f3', text: 'Clear water is always safe to drink.', ok: false, why: 'Water can look clear and still carry germs you cannot see.' },
      { id: 'water-f4', text: 'A pinch of salt makes any water safe.', ok: false, why: 'Salt does not kill the germs in water. Boil or treat it instead.' },
    ],
  },
  {
    id: 'rabies',
    title: 'RABIES ALERT',
    ask: 'a rabies-alert poster',
    motif: 'paw',
    basis: 'WHO and DOH rabies guidance: wash a bite at once, see a health worker, and vaccinate dogs.',
    slogans: [
      { id: 'rabies-s1', text: 'Kagat ng aso? Hugasan, tapos magpa-check!', ai: false },
      { id: 'rabies-s2', text: 'Bakunahan ang alaga, protektahan ang lahat!', ai: false },
      { id: 'rabies-s3', text: 'Be a good owner, vaccinate your dog!', ai: true },
    ],
    facts: [
      { id: 'rabies-f1', text: 'Wash a dog bite with soap and running water right away, then go to the health center.', ok: true, why: 'Washing at once helps, and a health worker decides what care is needed.' },
      { id: 'rabies-f2', text: 'Get your dogs vaccinated against rabies.', ok: true, why: 'Vaccinated dogs cannot pass on rabies, which protects the whole barangay.' },
      { id: 'rabies-f3', text: 'Put garlic on a dog bite. There is no need to see a health worker.', ok: false, why: 'Garlic does nothing for rabies. Every bite needs a health worker.' },
      { id: 'rabies-f4', text: 'A dog that looks healthy can never give you rabies.', ok: false, why: 'A dog can pass on rabies before it looks sick. Treat every bite seriously.' },
    ],
  },
  {
    id: 'baby',
    title: 'HEALTHY START',
    ask: 'a healthy-start-for-babies poster',
    motif: 'baby',
    basis: 'WHO and DOH infant feeding guidance: breast milk alone for the first six months, plus regular check-ups.',
    slogans: [
      { id: 'baby-s1', text: 'Gatas ni Nanay, unang regalo!', ai: false },
      { id: 'baby-s2', text: 'Check-up ni baby, huwag kaligtaan!', ai: false },
      { id: 'baby-s3', text: 'Little ones, big futures!', ai: true },
    ],
    facts: [
      { id: 'baby-f1', text: 'Breast milk alone is the best food for a baby’s first six months.', ok: true, why: 'For the first six months, breast milk gives a baby everything needed.' },
      { id: 'baby-f2', text: 'Take your baby to regular check-ups at the health center.', ok: true, why: 'Check-ups track growth and make sure vaccines are on time.' },
      { id: 'baby-f3', text: 'Babies need rice porridge from the first month.', ok: false, why: 'Other foods can wait until about six months. Ask the health worker.' },
      { id: 'baby-f4', text: 'Babies need extra water in hot months before six months.', ok: false, why: 'Breast milk already has the water a young baby needs.' },
    ],
  },
];

export const topicById = (id: string): Topic => TOPICS.find((t) => t.id === id) ?? (TOPICS[0] as Topic);
