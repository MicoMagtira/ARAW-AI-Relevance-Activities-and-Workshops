// "Tanong kay Chatbot" rounds (docs/SPEC.md section 4, Module 3). Every chatbot answer is SCRIPTED and written for the game: there is no live AI.
// The chatbot is fictional. Wrong answers are marked wrong in the feedback. No doses, no diagnosis; health facts follow docs/CONTENT_GUIDE.md section 3.

/** How the player rules on an answer: usable, wrong, or "see a health worker now". */
export type Ruling = 'tama' | 'mali' | 'magpatingin';

export const RULINGS: readonly Ruling[] = ['tama', 'mali', 'magpatingin'];

export interface ChatRound {
  id: string;
  /** What Bea types. */
  question: string;
  /** The chatbot's scripted reply. */
  answer: string;
  ruling: Ruling;
  /** Red-flag rounds always go to a health worker; ruling anything else earns an extra gentle warning. */
  redFlag: boolean;
  /** Why the ruling is right, in one or two plain sentences. */
  why: string;
  /** What a good answer would say. */
  good: string;
  /** Source or rationale, per CONTENT_GUIDE section 3. */
  basis: string;
  review_status: 'unreviewed';
}

const round = (
  id: string,
  ruling: Ruling,
  question: string,
  answer: string,
  why: string,
  good: string,
  basis: string,
  redFlag = ruling === 'magpatingin',
): ChatRound => ({ id, question, answer, ruling, redFlag, why, good, basis, review_status: 'unreviewed' });

/** 19 scripted rounds: 6 usable, 6 wrong, 7 red flags. A play draws 7 of them plus the privacy scenario. */
export const CHAT_ROUNDS: readonly ChatRound[] = [
  // --- Tama: usable general answers ---
  round(
    'cb-t01',
    'tama',
    'How long should I wash my hands?',
    'Wet your hands, lather with soap, and scrub the front, back, between the fingers and under the nails for at least 20 seconds. Rinse with clean water and dry with a clean towel.',
    'A general, well-known answer. It does not claim anything about you.',
    'This one is already good. It is plain, general and easy to check at your health center.',
    'WHO hand hygiene guidance (20 seconds with soap and water)',
  ),
  round(
    'cb-t02',
    'tama',
    'What is ORS, the oral rehydration salts my nurse mentioned?',
    'ORS is a packet of salts and sugar that you mix with clean water. It replaces the water and salts the body loses with diarrhoea. Mix it exactly the way the packet says. If the diarrhoea does not stop, or there is blood, please see a health worker.',
    'It explains what ORS is, follows the packet, and points to a health worker when things do not improve.',
    'Keep it general: what ORS does, to follow the packet, and when to see a health worker.',
    'WHO and DOH oral rehydration guidance',
  ),
  round(
    'cb-t03',
    'tama',
    'Why do children need vaccines?',
    'Vaccines teach the body to recognise certain germs before a real infection. They are tested for safety before approval and monitored afterwards. Ask your barangay health center for your child\'s vaccine schedule.',
    'A well-established fact, said calmly, with a pointer to the health center.',
    'It would say just this: how vaccines work, that safety is checked, and where to get the schedule.',
    'WHO and DOH immunization information',
  ),
  round(
    'cb-t04',
    'tama',
    'What do the two numbers in a blood pressure reading mean?',
    'Blood pressure is the force of blood against the walls of your arteries. The top number is the pressure when the heart beats and the bottom number is the pressure between beats. High blood pressure often has no signs, so regular checks at the health center help. Ask a health worker what your numbers mean for you.',
    'It explains the words in a general way and sends you to a health worker for your own numbers.',
    'Explain the words, then say that your own numbers are for a health worker to read.',
    'WHO hypertension fact sheet',
  ),
  round(
    'cb-t05',
    'tama',
    'How do I stop mosquitoes from breeding around our house?',
    'The Aedes mosquito that spreads dengue breeds in clean standing water. Cover, clean and empty drums, cans, tires and flower pot trays every week. Wear long sleeves and use repellent, and see a health worker early if someone has a fever.',
    'This matches the DOH 4S advice: search and destroy breeding places, protect yourself, and seek early consultation.',
    'Weekly emptying of standing water, protection from bites, and early check-ups.',
    'DOH 4S dengue prevention; WHO dengue fact sheet',
  ),
  round(
    'cb-t06',
    'tama',
    'I have a diabetes check-up next week. What should I ask my doctor?',
    'Some ideas: What do my test results mean? How often should I check my sugar? Which foods and activities are good for me? Are my medicines working? Write your questions down and bring a list of all your medicines.',
    'It helps Bea prepare questions for a real doctor. It does not diagnose or decide anything.',
    'A list of questions to bring to the check-up. That is the best use of a chatbot for health.',
    'General patient-visit preparation advice',
  ),

  // --- Mali: confident but wrong ---
  round(
    'cb-m01',
    'mali',
    'Do antibiotics cure a cold or the flu?',
    'Yes! Antibiotics cure colds and flu fast. Start taking them at the first sneeze so you recover quicker.',
    'Colds and flu come from viruses, and antibiotics do not work on viruses. Using them when they are not needed can make them work less well later.',
    'No. Antibiotics are for certain bacterial infections, and only when a health worker prescribes them.',
    'WHO antibiotic resistance fact sheet',
  ),
  round(
    'cb-m02',
    'mali',
    'My lola has diabetes. Can guava leaf tea cure it so she can stop her medicine?',
    'Yes. Guava leaf tea cures diabetes in a few days, so she can safely stop her medicine.',
    'No drink or herb has been shown to cure diabetes. Stopping medicine without asking her doctor can be dangerous.',
    'There is no proven herbal cure. She should keep to her treatment and ask her doctor before any change.',
    'WHO diabetes fact sheet',
  ),
  round(
    'cb-m03',
    'mali',
    'Can the flu shot give me the flu?',
    'Yes. The flu shot contains the live flu germ, so you will usually get the flu from it.',
    'The usual flu shot cannot give you the flu. A sore arm or a mild, short feeling of tiredness can happen as the body reacts.',
    'The flu shot cannot cause the flu. Some mild, short side effects can happen. Ask your health center about it.',
    'WHO and DOH vaccine safety information',
  ),
  round(
    'cb-m04',
    'mali',
    'I got wet in the rain. Is that what gives me a cold?',
    'Yes. Getting wet or sitting in the cold air is what causes a cold, so always dry off right away.',
    'Many families believe this, and keeping warm and dry is comfortable. But colds are caused by viruses that spread between people, not by rain.',
    'Colds come from viruses. Wash your hands, and see a health worker if your symptoms last or get worse.',
    'WHO / DOH respiratory infection information',
  ),
  round(
    'cb-m05',
    'mali',
    'My baby has a fever. How much paracetamol should I give?',
    'Any amount is fine. Just keep giving it until the fever is gone.',
    'The right amount depends on the child\'s age and weight, and a chatbot cannot know them. Too much medicine is harmful. A chatbot should not give doses at all.',
    'It cannot tell you an amount. Ask a pharmacist or health worker, who can check your child\'s age and weight.',
    'CONTENT_GUIDE section 3: no dosing; ask a health worker',
  ),
  round(
    'cb-m06',
    'mali',
    'I burned my hand on the stove. Should I put toothpaste on it?',
    'Yes. Toothpaste cools the burn and stops blisters, so rub it on right away.',
    'Toothpaste, ice or oil can make a burn worse. Cool running water is the safe first step for a small burn.',
    'Hold the burn under cool, clean running water. See a health worker if it is large, deep or on the face or hands.',
    'WHO / Red Cross first-aid guidance for burns',
  ),

  // --- Magpatingin: red flags that always go to a health worker ---
  round(
    'cb-r01',
    'magpatingin',
    'My tatay has chest pain and is sweating. It started while he was walking. What should he do?',
    'It is probably just gas. Let him sit down, drink warm water and rest. It should pass.',
    'Chest pain can be a sign of a heart emergency. A chatbot cannot tell gas from a heart problem, so this goes to a health worker now.',
    'Treat it as an emergency: get him to the nearest hospital or call for help right away.',
    'DOH / WHO cardiovascular warning signs',
  ),
  round(
    'cb-r02',
    'magpatingin',
    'My son had a fever for three days. Now it is gone, but he has bad belly pain, keeps vomiting and his gums are bleeding.',
    'Great news, the fever is gone! He is recovering. Give him lots of rest and plenty of water.',
    'These are dengue warning signs. The most dangerous time can be when the fever goes down. He needs hospital care now.',
    'Say it plainly: these are warning signs, go to a hospital or health center right now.',
    'DOH and WHO dengue warning signs',
  ),
  round(
    'cb-r03',
    'magpatingin',
    "My lolo's face is drooping on one side and his words are slurred. He says he just feels sleepy.",
    'He is probably tired. Let him lie down and sleep, and check on him in the morning.',
    'A drooping face and slurred speech are stroke signs. Every minute matters, and sleeping it off can cost him a lot.',
    'Call for help and go to the nearest hospital right away. Do not wait to see if it passes.',
    'WHO / DOH stroke warning signs (face, arm, speech)',
  ),
  round(
    'cb-r04',
    'magpatingin',
    'My little girl is breathing very fast and it looks hard for her. Her lips look bluish.',
    'Try some steam and a warm drink. If she is not better by morning, you can see someone then.',
    'Trouble breathing is always a reason to see a health worker right away. Waiting until morning is not safe.',
    'Go to the nearest hospital or health center now, or call for emergency help.',
    'WHO / DOH respiratory danger signs',
  ),
  round(
    'cb-r05',
    'magpatingin',
    'My baby is 6 weeks old and feels hot. Should I just give a cool sponge bath and wait?',
    'A cool sponge bath is fine. Most baby fevers go away on their own, so just keep an eye on her.',
    'A fever in a very young baby always needs a health worker quickly. Young babies can get seriously sick fast.',
    'Take the baby to a health facility now. Do not give any medicine before a health worker checks her.',
    'WHO IMCI young infant danger signs',
  ),
  round(
    'cb-r06',
    'magpatingin',
    'A stray dog scratched my arm. It only broke the skin a little. Is it okay to ignore it?',
    'A small scratch is nothing to worry about. Put a plaster on it and carry on.',
    'An animal bite or scratch can carry rabies, which is deadly but can be prevented if you get care early.',
    'Wash the wound well with soap and running water, then go to a health center or animal bite center on the same day.',
    'DOH rabies prevention; WHO rabies fact sheet',
  ),
  round(
    'cb-r07',
    'magpatingin',
    'Lately I feel like I do not want to live anymore.',
    'Everyone feels sad sometimes. Try to get some sleep and think happy thoughts. It will pass.',
    'You deserve real care. Brushing this off is not good enough. Talk to someone you trust and a health worker now.',
    'A good answer is kind, takes it seriously, and points to a trusted person, a health worker, or the crisis hotline 1553.',
    'CONTENT_GUIDE red flags; DOH-NCMH crisis hotline 1553',
  ),
];

/** One app permission in the privacy round. */
export interface Permission {
  id: string;
  label: string;
  /** What the app would see or do with it. */
  detail: string;
  /** True when the app truly needs it to do its job. */
  needed: boolean;
  /** One sentence shown in the feedback. */
  why: string;
}

export interface PrivacyScenario {
  id: string;
  /** Fictional app. */
  app: string;
  /** What the app does. */
  job: string;
  permissions: readonly Permission[];
  basis: string;
  review_status: 'unreviewed';
}

/** The privacy round: one fictional step-counter app asks for four permissions and only one is needed. */
export const PRIVACY_SCENARIO: PrivacyScenario = {
  id: 'cb-p01',
  app: 'Hakbang Buddy',
  job: 'Hakbang Buddy is a free step counter. It counts your steps each day and shows a simple chart. Nothing more.',
  permissions: [
    {
      id: 'motion',
      label: 'Motion sensor',
      detail: 'Lets the app feel your steps.',
      needed: true,
      why: 'Allow: counting steps is its whole job, and it needs the motion sensor.',
    },
    {
      id: 'contacts',
      label: 'Your contacts',
      detail: 'Lets the app read the names and numbers of the people you know.',
      needed: false,
      why: 'Do not allow: counting steps never needs your family and friends list.',
    },
    {
      id: 'location',
      label: 'Your location',
      detail: 'Lets the app see where you walk all day.',
      needed: false,
      why: 'Do not allow: there is no map, so it does not need to know where you are.',
    },
    {
      id: 'photos',
      label: 'Your photos',
      detail: 'Lets the app open your photo gallery.',
      needed: false,
      why: 'Do not allow: your photos are private and a step counter has no use for them.',
    },
  ],
  basis: 'National Privacy Commission data minimisation idea: collect only what is needed',
  review_status: 'unreviewed',
};
