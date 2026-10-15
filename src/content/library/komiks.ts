// Library: Ara's Komiks, Season 1 "The Miracle Tea" (docs/SPEC.md section 8, docs/CONTENT_GUIDE.md section 6).
// Episode N unlocks when module N is complete. Panels are drawn as pixel SVG scenes from these descriptors.
// Rules: 4 to 6 panels, at most 2 short bubbles per panel, every episode ends kindly, nobody is shamed for believing.
// All people, pages and products are fictional. On-screen fakes are drawn with the "ARAW GAME · FAKE" stamp.
import type { ModuleTag } from '../factOrFake/schema';

export const KOMIKS_CAST = ['ara', 'lola_nena', 'tita_baby', 'kuya_jun', 'bea', 'aling_nena'] as const;
export type KomiksCastId = (typeof KOMIKS_CAST)[number];

export const KOMIKS_CAST_NAMES: Record<KomiksCastId, string> = {
  ara: 'Ara',
  lola_nena: 'Lola Nena',
  tita_baby: 'Tita Baby',
  kuya_jun: 'Kuya Jun',
  bea: 'Bea',
  aling_nena: 'Aling Nena',
};

export const KOMIKS_SETTINGS = [
  'sala',
  'kitchen',
  'bea_room',
  'phone_screen',
  'health_center',
  'barangay_hall',
  'sari_sari',
  'street',
  'dinner_table',
] as const;
export type KomiksSetting = (typeof KOMIKS_SETTINGS)[number];

export const KOMIKS_TIMES = ['morning', 'day', 'evening', 'night'] as const;
export type KomiksTime = (typeof KOMIKS_TIMES)[number];

export const KOMIKS_EXPRESSIONS = ['happy', 'proud', 'laughing', 'calm', 'curious', 'thinking', 'surprised', 'worried', 'sleepy', 'wink'] as const;
export type KomiksExpression = (typeof KOMIKS_EXPRESSIONS)[number];

/** Expressions that count as a kind, warm ending. */
export const KIND_EXPRESSIONS: readonly KomiksExpression[] = ['happy', 'proud', 'laughing', 'calm'];

export const KOMIKS_PROPS = [
  'phone',
  'tea_box',
  'pill_box',
  'laptop',
  'leaflets',
  'poster',
  'moon',
  'kiosk',
  'bp_cuff',
  'phone_basket',
  'feedback_form',
  'villain_cards',
  'merienda',
] as const;
export type KomiksProp = (typeof KOMIKS_PROPS)[number];

export interface KomiksCharacter {
  who: KomiksCastId;
  expression: KomiksExpression;
}

export interface KomiksBubble {
  speaker: KomiksCastId;
  text: string;
  /** say: normal bubble; think: cloud bubble. */
  kind: 'say' | 'think';
}

/** A phone or laptop screen drawn inside the panel. */
export interface KomiksScreen {
  /** Fictional page, chat or app name shown on the screen. */
  author: string;
  text: string;
  /** Fake posts are drawn with the "ARAW GAME · FAKE" stamp. */
  fake: boolean;
}

export interface KomiksPanel {
  setting: KomiksSetting;
  time: KomiksTime;
  /** Who is in the scene, left to right (1 to 4). */
  characters: readonly KomiksCharacter[];
  props: readonly KomiksProp[];
  /** Narration box at the top of the panel. */
  caption?: string;
  screen?: KomiksScreen;
  /** At most 2 short speech bubbles; every speaker is in the scene. */
  bubbles: readonly KomiksBubble[];
  /** Scene description for screen readers. */
  alt: string;
}

export interface KomiksEpisode {
  id: string;
  n: number;
  title: string;
  /** Completing this module unlocks the episode. */
  module: ModuleTag;
  /** One-line teaser for the episode list. */
  summary: string;
  panels: readonly KomiksPanel[];
  review_status: 'unreviewed';
}

export const KOMIKS_SEASON_TITLE = 'Season 1: The Miracle Tea';

// Small builders keep the scripts readable.
const c = (who: KomiksCastId, expression: KomiksExpression): KomiksCharacter => ({ who, expression });
const say = (speaker: KomiksCastId, text: string): KomiksBubble => ({ speaker, text, kind: 'say' });
const think = (speaker: KomiksCastId, text: string): KomiksBubble => ({ speaker, text, kind: 'think' });
const panel = (
  setting: KomiksSetting,
  time: KomiksTime,
  characters: readonly KomiksCharacter[],
  bubbles: readonly KomiksBubble[],
  alt: string,
  extra: { props?: readonly KomiksProp[]; caption?: string; screen?: KomiksScreen } = {},
): KomiksPanel => ({ setting, time, characters, props: extra.props ?? [], caption: extra.caption, screen: extra.screen, bubbles, alt });
const episode = (n: number, title: string, summary: string, panels: readonly KomiksPanel[]): KomiksEpisode => ({
  id: `ep${String(n).padStart(2, '0')}`,
  n,
  title,
  module: `m${String(n).padStart(2, '0')}` as ModuleTag,
  summary,
  panels,
  review_status: 'unreviewed',
});

const TEA_AD: KomiksScreen = {
  author: 'Healthy Pinoy Tips 24/7 · Sponsored',
  text: 'Doctor-approved Miracle Tea Max! Replaces maintenance meds! 100% natural!',
  fake: true,
};

export const KOMIKS: readonly KomiksEpisode[] = [
  episode(1, 'The Miracle Tea', 'A "doctor" video sells a tea that "replaces maintenance meds". Tita Baby forwards it with love.', [
    panel('sala', 'morning', [c('tita_baby', 'surprised')], [say('tita_baby', 'Hala! A doctor says this tea replaces maintenance meds. Perfect for Mama!')],
      'Tita Baby sits on the sala sofa, eyes wide, holding her phone. The screen shows a sponsored video of a man in a lab coat holding a tea box.',
      { props: ['phone'], screen: TEA_AD }),
    panel('phone_screen', 'morning', [c('tita_baby', 'happy')], [think('tita_baby', 'Sharing is caring. Sana makatulong!')],
      'A close-up of the family group chat. Tita Baby\'s forwarded tea video sits at the bottom with three praying-hands emojis.',
      { caption: 'Tita Baby forwards it to the family GC, with three praying hands.', props: ['phone'] }),
    panel('kitchen', 'day', [c('lola_nena', 'curious'), c('bea', 'thinking')], [
      say('lola_nena', 'Is my phone listening to me? It keeps showing me tea ads!'),
      say('bea', 'It\'s AI, Lola. It learns patterns from what you tap and watch.'),
    ], 'In the kitchen, Lola Nena holds up her phone, puzzled. Her granddaughter Bea leans in to look, chin in hand.', { props: ['phone', 'tea_box'] }),
    panel('kitchen', 'day', [c('ara', 'happy'), c('bea', 'curious')], [
      say('ara', 'The feed guesses what you like. It never checks if an ad is true!'),
      think('bea', 'So who checks? Kami, I guess.'),
    ], 'Ara, a small sun-spirit girl with gold sun-ray hair, floats beside Bea with a bright smile. Bea taps her chin.'),
    panel('dinner_table', 'evening', [c('lola_nena', 'calm'), c('bea', 'happy'), c('tita_baby', 'happy')], [
      say('lola_nena', 'Sige, I\'ll keep taking my pills until we ask Kuya Jun.'),
    ], 'The family shares dinner at a wooden table. Lola Nena smiles and pats Bea\'s hand. Tita Baby passes the rice.',
      { caption: 'To be continued...' }),
  ]),

  episode(2, 'Lola\'s Maintenance Meds', 'Lola wonders about stopping her pills, and the app\'s filter missed a Taglish post.', [
    panel('kitchen', 'morning', [c('lola_nena', 'thinking')], [think('lola_nena', 'Every day, pills. Maybe the tea is enough na?')],
      'Early morning in the kitchen. Lola Nena looks at her weekly pill box beside a box of Miracle Tea Max, deep in thought.',
      { props: ['pill_box', 'tea_box'] }),
    panel('bea_room', 'day', [c('bea', 'curious'), c('ara', 'thinking')], [
      say('bea', 'Why didn\'t the app flag that tea post as false?'),
      say('ara', 'Its filter learned mostly from English posts. This one was Taglish!'),
    ], 'Bea sits at her desk with a laptop open to the tea post. Ara hovers over the screen, pointing at it.', { props: ['laptop'] }),
    panel('phone_screen', 'day', [c('ara', 'calm')], [say('ara', 'AI only knows the examples it was given.')],
      'A close-up of a Taglish post from a page called Lola\'s Remedies Club, stamped as a game fake. Ara peeks in from the corner.', {
        caption: 'The filter missed it. It had never seen enough posts like this one.',
        screen: { author: 'Lola\'s Remedies Club', text: 'Grabe! Tumigil na si Mommy sa gamot, okay na siya dahil sa tea!', fake: true },
      }),
    panel('kitchen', 'day', [c('bea', 'calm'), c('lola_nena', 'worried')], [
      say('bea', 'Lola, please don\'t stop your pills yet. Let\'s ask your doctor first.'),
      say('lola_nena', 'Sige, apo. But I\'m still curious about that tea.'),
    ], 'Bea kneels beside Lola Nena\'s chair and holds her hand. Lola looks unsure but listens.', { props: ['pill_box'] }),
    panel('sari_sari', 'day', [c('aling_nena', 'happy'), c('lola_nena', 'happy')], [
      say('aling_nena', 'Kuya Jun is at the health center tomorrow, Nena!'),
      say('lola_nena', 'Then tomorrow, we ask him.'),
    ], 'At the sari-sari store window, Aling Nena hands Lola Nena a bag of pandesal. Both are smiling.', { props: ['merienda'] }),
  ]),

  episode(3, 'Bea Asks the Bot', 'The chatbot sounds very sure, then says to see a doctor. Bea decides to ask Kuya Jun.', [
    panel('bea_room', 'night', [c('bea', 'thinking')], [think('bea', 'No full names, no Lola\'s records. Just the question.')],
      'Night in Bea\'s room. She types on her phone by lamplight, carefully leaving out personal details.', {
        props: ['phone', 'moon'],
        screen: { author: 'Chatbot', text: 'Bea: Can a tea replace blood pressure pills?', fake: false },
      }),
    panel('phone_screen', 'night', [c('bea', 'surprised'), c('ara', 'wink')], [
      say('bea', 'Hala, it sounds so sure!'),
      say('ara', 'Sounding sure is not the same as being right.'),
    ], 'The chatbot\'s reply fills the phone screen in neat, confident sentences. Bea\'s eyebrows shoot up; Ara winks.', {
      screen: { author: 'Chatbot', text: 'Some teas contain compounds studied for heart health and may support wellness...', fake: false },
    }),
    panel('phone_screen', 'night', [c('bea', 'curious'), c('ara', 'happy')], [
      say('bea', 'Oh, wait. At the end it says to talk to a doctor.'),
      say('ara', 'Ayan! That part is the useful one.'),
    ], 'Bea scrolls to the end of the chatbot\'s answer, where it advises talking to a health worker. Ara gives a thumbs up.', {
      screen: { author: 'Chatbot', text: '...but do not stop or change any medicine on your own. Please talk to a doctor or health worker.', fake: false },
    }),
    panel('bea_room', 'night', [c('bea', 'proud'), c('ara', 'happy')], [
      say('bea', 'A chatbot can\'t examine Lola. Kuya Jun can.'),
      say('ara', 'Good call! Real question, real person.'),
    ], 'Bea sets her phone down and stands up with a determined grin. Ara does a little twirl beside her.', { props: ['phone'] }),
    panel('kitchen', 'morning', [c('bea', 'happy'), c('lola_nena', 'laughing')], [
      say('bea', 'Lola, tara sa health center later?'),
      say('lola_nena', 'Basta may merienda after, ha!'),
    ], 'Morning in the kitchen. Bea hugs Lola Nena from behind while Lola laughs over a cup of coffee.', { props: ['merienda'] }),
  ]),

  episode(4, 'The Doctor Who Wasn\'t', 'Kuya Jun shows that the "doctor" never said it, and the family names the tricks.', [
    panel('health_center', 'day', [c('kuya_jun', 'calm'), c('lola_nena', 'curious'), c('bea', 'curious')], [
      say('kuya_jun', 'Let\'s look at this "doctor" video together.'),
    ], 'At the barangay health center, Kuya Jun, the barangay health worker, holds up his phone. Lola Nena and Bea lean in.', { props: ['phone'] }),
    panel('phone_screen', 'day', [c('kuya_jun', 'calm'), c('bea', 'surprised')], [
      say('kuya_jun', 'The doctor\'s own page never posted this. The video was faked with AI.'),
      say('bea', 'A deepfake?!'),
    ], 'The tea video plays on Kuya Jun\'s phone, now stamped as a game fake. Bea gasps.', {
      screen: { author: 'Healthy Pinoy Tips 24/7', text: 'Doctor says: Miracle Tea Max cures high blood, diabetes AND joint pain!', fake: true },
    }),
    panel('health_center', 'day', [c('ara', 'wink'), c('bea', 'laughing')], [
      say('ara', 'Dr. Fake AND Miracle Mike in one post? Ang dami n\'yo!'),
      say('bea', 'Cure-all ka na naman, Mike!'),
    ], 'Ara fans out a set of pixel villain cards like a magician. Bea laughs and points at the Miracle Mike card.', { props: ['villain_cards'] }),
    panel('health_center', 'day', [c('lola_nena', 'thinking'), c('kuya_jun', 'calm')], [
      say('lola_nena', 'So the tea won\'t fix my blood pressure?'),
      say('kuya_jun', 'Keep your meds as your doctor said, Nay. We\'ll check your BP regularly.'),
    ], 'Kuya Jun sits beside Lola Nena and wraps a blood pressure cuff around her arm. She listens closely.', { props: ['bp_cuff'] }),
    panel('street', 'evening', [c('lola_nena', 'proud'), c('bea', 'laughing')], [
      say('lola_nena', 'Next time, I\'ll ask who really said it.'),
      say('bea', 'Ikaw na, Lola Detective!'),
    ], 'Lola Nena and Bea walk home arm in arm down the barangay street at sunset.'),
  ]),

  episode(5, 'Kindly, Tita', 'Bea replies kindly in the GC, and Tita Baby checks the FDA verification portal herself.', [
    panel('sala', 'day', [c('bea', 'thinking'), c('ara', 'wink')], [
      think('bea', 'If I just say "fake news, Tita!" she\'ll feel bad.'),
      say('ara', 'Start with thanks. She shared it out of love.'),
    ], 'Bea sits cross-legged on the sofa, phone in hand, thinking hard. Ara floats at her shoulder.', { props: ['phone'] }),
    panel('phone_screen', 'day', [c('bea', 'calm')], [],
      'A close-up of the family group chat. Bea\'s gentle reply sits under Tita Baby\'s tea forward.', {
        caption: 'Bea replies in the family GC.',
        screen: { author: 'Bea', text: 'Salamat, Tita, for always looking out for Lola! I checked this one: the doctor never said it.', fake: false },
      }),
    panel('sala', 'day', [c('tita_baby', 'surprised')], [say('tita_baby', 'Hala, talaga? But it looked so official.')],
      'In her own sala, Tita Baby reads Bea\'s message, hand on her cheek.', { caption: 'Tita Baby pauses before replying.', props: ['phone'] }),
    panel('sala', 'day', [c('tita_baby', 'thinking')], [say('tita_baby', 'Not registered, and it claims to cure everything? Ay, naku.')],
      'Tita Baby squints at her laptop, searching on her own. A notebook with "CHECK FIRST" written in it lies beside her.', {
        caption: 'Tita searches the FDA Philippines verification portal herself. The tea is not on the list.',
        props: ['laptop'],
      }),
    panel('sala', 'evening', [c('tita_baby', 'happy'), c('lola_nena', 'proud'), c('ara', 'happy')], [
      say('lola_nena', 'Proud of you, Baby!'),
      say('ara', 'Hala, Tita! Liwanag ng pamilya ka talaga. ✨'),
    ], 'Tita Baby shows Lola Nena her new GC message: she took down the forward and asked everyone to check with Kuya Jun first. Ara sparkles.',
      { props: ['phone'] }),
  ]),

  episode(6, 'Kuya Jun\'s Busy Day', 'An AI tool drafts translated leaflets, and Kuya Jun still does the home visit.', [
    panel('health_center', 'morning', [c('kuya_jun', 'sleepy')], [say('kuya_jun', 'So many leaflets to translate, so little time.')],
      'Monday morning at the health center. Kuya Jun sits behind a tall stack of leaflets, sipping coffee.',
      { caption: 'Monday at the health center. The home-visit list is long.', props: ['leaflets'] }),
    panel('health_center', 'morning', [c('kuya_jun', 'curious'), c('ara', 'happy')], [
      say('kuya_jun', 'Let\'s try the AI tool for the first draft.'),
      say('ara', 'AI is fast at drafts. You\'re the one who checks.'),
    ], 'Kuya Jun opens a laptop. Ara floats over the screen, cheering.', { props: ['laptop'] }),
    panel('health_center', 'day', [c('kuya_jun', 'thinking'), c('ara', 'proud')], [
      say('kuya_jun', 'It wrote "dengue mosquitoes bite only at night". Mali! Mostly daytime.'),
      say('ara', 'Human in the loop, ayan! Catch it, fix it, then share.'),
    ], 'Kuya Jun circles a sentence on the printed draft with a red pen. Ara gives a proud thumbs up.', { props: ['leaflets'] }),
    panel('street', 'day', [c('kuya_jun', 'happy'), c('lola_nena', 'happy')], [
      say('lola_nena', 'The leaflet is in our own language now!'),
      say('kuya_jun', 'And I still come by to check on you myself, Nay.'),
    ], 'At Lola Nena\'s gate, Kuya Jun hands her a leaflet, a bag over his shoulder for the home visit.', { props: ['leaflets', 'bp_cuff'] }),
    panel('street', 'evening', [c('bea', 'curious'), c('kuya_jun', 'proud')], [
      say('bea', 'Kuya, who\'s responsible if a leaflet is wrong?'),
      say('kuya_jun', 'Me and the health center. Not the AI.'),
    ], 'Bea walks beside Kuya Jun as the street lights come on. He taps the leaflet with a confident smile.'),
  ]),

  episode(7, 'A Poster for the Barangay', 'Bea makes an honest health poster: labelled, with permission and credit.', [
    panel('barangay_hall', 'day', [c('aling_nena', 'curious'), c('bea', 'happy')], [
      say('aling_nena', 'Bea, can you make a poster about miracle-cure scams?'),
      say('bea', 'Sige po! I\'ll use AI for the drawing.'),
    ], 'In the barangay hall, Aling Nena points at an empty bulletin board. Bea gives an eager nod.'),
    panel('bea_room', 'day', [c('bea', 'thinking'), c('ara', 'proud')], [
      think('bea', 'I could paste a real doctor\'s face on it... no. That\'s a deepfake.'),
      say('ara', 'Ayan! No faces without consent.'),
    ], 'Bea sits at her laptop, an AI image tool open. She shakes her head at an idea. Ara beams.', { props: ['laptop'] }),
    panel('bea_room', 'day', [c('bea', 'happy'), c('ara', 'happy')], [
      say('bea', 'I\'ll label it "Made with AI" and credit Kuya Jun\'s photo, with his OK.'),
      say('ara', 'Label, consent, credit. Galing!'),
    ], 'Bea holds up the finished poster: a pixel teapot with a red X and a small "Made with AI" label in the corner.', { props: ['poster'] }),
    panel('barangay_hall', 'day', [c('kuya_jun', 'happy'), c('lola_nena', 'proud')], [
      say('kuya_jun', 'Thanks for asking before using my photo, Bea.'),
      say('lola_nena', 'Ang ganda! And honest pa.'),
    ], 'The poster hangs on the barangay hall board. Kuya Jun and Lola Nena admire it.', { props: ['poster'] }),
    panel('sari_sari', 'evening', [c('aling_nena', 'laughing'), c('bea', 'proud')], [
      say('aling_nena', 'My customers read it while they wait for their change!'),
    ], 'A copy of the poster is taped to the sari-sari store window. Aling Nena laughs as Bea grins proudly.', { props: ['poster'] }),
  ]),

  episode(8, 'Lights Out, Bea', 'Bea stays up reading debunks, learns to rest, and joins a phone-free dinner with Lola.', [
    panel('bea_room', 'night', [c('bea', 'sleepy')], [think('bea', 'Just one more video. Okay, one more more.')],
      'Bea lies in bed lit only by her phone, eyes half closed. A clock on the wall says 1 AM.',
      { caption: '1 AM. One more debunk video... then another.', props: ['phone', 'moon'] }),
    panel('bea_room', 'night', [c('lola_nena', 'calm'), c('bea', 'surprised')], [
      say('lola_nena', 'Apo, your light is still on. Pahinga muna?'),
      say('bea', 'Lola! Sorry po, I lost track of time.'),
    ], 'Lola Nena peeks in through the door in her duster, holding a glass of water. Bea sits up, startled.', { props: ['phone'] }),
    panel('bea_room', 'night', [c('ara', 'wink'), c('bea', 'thinking')], [
      say('ara', 'The feed is built to never end. But you can end it.'),
      think('bea', 'Autoplay off. Phone charges outside my room.'),
    ], 'Ara points at the endless feed on the screen. Bea switches off autoplay.', { props: ['phone', 'moon'] }),
    panel('dinner_table', 'evening', [c('lola_nena', 'laughing'), c('bea', 'happy'), c('tita_baby', 'happy')], [
      say('lola_nena', 'Now I can tell you all my stories!'),
      say('bea', 'Kwento ni Lola, the best feed.'),
    ], 'The next evening, all the phones rest in a basket by the door. The family laughs around the dinner table.',
      { caption: 'The next evening: phone-free dinner.', props: ['phone_basket'] }),
    panel('bea_room', 'morning', [c('bea', 'happy'), c('ara', 'proud')], [
      say('bea', 'A full night\'s sleep. My brain feels brand new!'),
      say('ara', 'Rest helps mood and memory. Proud ate here!'),
    ], 'Morning sunlight fills Bea\'s room. She stretches by the window, fresh and smiling, as Ara cheers.'),
  ]),

  episode(9, 'A Kiosk for Lola', 'The new kiosk confuses Lola, so the family gives feedback, and the kiosk gets large text and voice.', [
    panel('health_center', 'day', [c('lola_nena', 'thinking')], [think('lola_nena', 'The letters are so tiny. Where do I press?')],
      'At the health center, Lola Nena stands in front of a new AI kiosk covered in small English text.', { props: ['kiosk'] }),
    panel('health_center', 'day', [c('bea', 'curious'), c('kuya_jun', 'calm')], [
      say('bea', 'It\'s only in English, and it has no voice.'),
      say('kuya_jun', 'Many visitors struggle with it, not just Lola.'),
    ], 'Bea and Kuya Jun look at the kiosk screen. Behind them, other visitors wait in line, also confused.', { props: ['kiosk'] }),
    panel('health_center', 'day', [c('ara', 'thinking'), c('bea', 'happy')], [
      say('ara', 'If it was built without lolas in mind, it will miss lolas.'),
      say('bea', 'Then let\'s give feedback!'),
    ], 'Ara floats by the kiosk while Bea picks up a feedback form from the counter.', { props: ['kiosk', 'feedback_form'] }),
    panel('barangay_hall', 'day', [c('lola_nena', 'proud'), c('kuya_jun', 'happy')], [
      say('lola_nena', 'Bigger letters, a voice, and a real person nearby.'),
      say('kuya_jun', 'Noted, Nay! A human option always stays.'),
    ], 'At a barangay meeting, Lola Nena reads her feedback aloud. Kuya Jun writes it on a big sheet of paper.',
      { caption: 'The family writes feedback with the health center team.', props: ['feedback_form'] }),
    panel('health_center', 'day', [c('lola_nena', 'happy'), c('ara', 'happy')], [
      say('lola_nena', 'Ayan! Now it talks in Tagalog, and I can read it!'),
      say('ara', 'Para sa lahat, talaga!'),
    ], 'Weeks later, the kiosk shows large letters and a speaker icon. Lola Nena taps it confidently while Ara celebrates.',
      { caption: 'A few weeks later...', props: ['kiosk'] }),
  ]),

  episode(10, 'The Hearing', 'The tea seller\'s app leaked buyers\' data. The family learns their rights, and Lola\'s check-up is good.', [
    panel('sala', 'day', [c('tita_baby', 'worried')], [say('tita_baby', 'Hala! I bought the tea through that app before.')],
      'Tita Baby sits on the sofa, worried, reading a notice on her phone from the tea seller\'s app.', {
        props: ['phone'],
        screen: { author: 'Miracle Tea Max app', text: 'Notice: some customer names, addresses and orders may have been exposed.', fake: false },
      }),
    panel('sala', 'day', [c('bea', 'calm'), c('tita_baby', 'curious')], [
      say('bea', 'You have rights, Tita. You can ask what data they kept, and ask them to erase it.'),
      say('tita_baby', 'Talaga? Even me, just a customer?'),
    ], 'Bea sits beside Tita Baby and shows her a simple list of data rights on her phone.',
      { caption: 'Data Privacy Act basics. Educational, not legal advice.', props: ['phone'] }),
    panel('barangay_hall', 'day', [c('kuya_jun', 'calm'), c('tita_baby', 'proud'), c('ara', 'happy')], [
      say('kuya_jun', 'The company that used the AI is responsible, not "the AI".'),
      say('tita_baby', 'Then I\'ll write to them first. If they ignore me, I go to the NPC.'),
    ], 'At a barangay info session on data rights, a banner reads "KARAPATAN MO". Tita Baby takes notes with a determined face.', {
      caption: 'The barangay holds a hearing-style info session. First the company, then the National Privacy Commission.',
    }),
    panel('health_center', 'morning', [c('kuya_jun', 'happy'), c('lola_nena', 'happy')], [
      say('kuya_jun', 'Your blood pressure is well controlled, Nay. Keep it up!'),
      say('lola_nena', 'I kept my meds and asked the right people.'),
    ], 'At Lola Nena\'s check-up, Kuya Jun removes the blood pressure cuff with a big smile. Lola beams.', { props: ['bp_cuff', 'pill_box'] }),
    panel('dinner_table', 'evening', [c('tita_baby', 'happy'), c('lola_nena', 'laughing'), c('bea', 'happy'), c('ara', 'proud')], [
      say('tita_baby', 'Next time a miracle post comes, we pause first.'),
      say('ara', 'Kailan magtitiwala? After we check. Salamat, pamilya! ✨'),
    ], 'The whole family shares dinner under a warm lamp, laughing together. Ara floats above the table, sparkling.',
      { caption: 'Season 1 · The End', props: ['merienda'] }),
  ]),
];

export const komiksByNumber = (n: number): KomiksEpisode | undefined => KOMIKS.find((e) => e.n === n);
