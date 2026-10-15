// "Turuan si AI" example posts (docs/SPEC.md section 4, Module 2). All pages and posts are fictional and written for the game.
// Fakes are marked "ARAW GAME · FAKE" when revealed. Local-language lines are plain and short; every entry still needs a native-speaker review.
import type { Example, Label } from '../modules/m02/naiveBayes';

export type PostLang = 'en' | 'tl' | 'ceb';

export interface TuruanPost extends Example {
  id: string;
  /** Fictional page or person shown above the post. */
  author: string;
  lang: PostLang;
  /** One line shown after the player labels it (training) or after the detector answers (test). */
  why: string;
  review_status: 'unreviewed';
}

const post = (id: string, lang: PostLang, label: Label, author: string, text: string, why: string): TuruanPost => ({
  id,
  lang,
  label,
  author,
  text,
  why,
  review_status: 'unreviewed',
});

/** Step 1: ten English posts the player labels. The detector learns from the player's labels, right or wrong. */
export const TRAIN_POSTS: readonly TuruanPost[] = [
  post(
    'tu-t01',
    'en',
    'fake',
    'Gamot Barkada Page',
    'SHOCKING! Doctors hate this secret: one cup of guava leaf tea cures diabetes in 3 days. Share before they delete this!',
    'Fake: a secret cure, "doctors hate it" and a rush to share are classic tricks.',
  ),
  post(
    'tu-t02',
    'en',
    'real',
    'Barangay Health Desk',
    'The DOH reminds everyone to wash hands with soap and water. Visit your nearest health center for free vaccines for children.',
    'Real: calm, practical advice that points to your health center.',
  ),
  post(
    'tu-t03',
    'en',
    'fake',
    'Bilis Gumaling Shop',
    '100% guaranteed miracle pill melts fat and cures cancer. No doctor needed. Order now, only 50 left!',
    'Fake: "100% guaranteed", "miracle" and "no doctor needed" are red flags.',
  ),
  post(
    'tu-t04',
    'en',
    'real',
    'Kalusugan Muna Page',
    'WHO advises that adults get at least 150 minutes of moderate exercise each week. Ask your doctor what is safe for you.',
    'Real: a well-known health guideline that tells you to ask a doctor.',
  ),
  post(
    'tu-t05',
    'en',
    'fake',
    'Ang Totoo Daw Channel',
    'Government is hiding the truth: vaccines contain microchips. Wake up and share with everyone you love!',
    'Fake: a hidden-truth story with no proof and a push to share.',
  ),
  post(
    'tu-t06',
    'en',
    'real',
    'Tita Ana, Health Worker',
    'If you have a fever for more than three days, see a health worker. Drink plenty of fluids and rest at home meanwhile.',
    'Real: sensible advice that sends you to a health worker.',
  ),
  post(
    'tu-t07',
    'en',
    'fake',
    'Lutong Lola Tips',
    'Drink hot water with garlic every hour and the virus dies. A famous doctor says this cures everything. Forward to 10 friends!',
    'Fake: one cure for everything and an unnamed "famous doctor".',
  ),
  post(
    'tu-t08',
    'en',
    'real',
    'Sagip Lamok Barangay',
    'Dengue spreads through mosquito bites. Remove standing water around your home every week. The local health office can help.',
    'Real: a well-established fact with a simple action.',
  ),
  post(
    'tu-t09',
    'en',
    'fake',
    'Natural Lang Po',
    'Secret cure for high blood pressure found. Stop taking your medicine and use this herbal powder instead. Guaranteed!',
    'Fake: never stop your medicine because of a post. A health worker decides.',
  ),
  post(
    'tu-t10',
    'en',
    'real',
    'Klinika ng Bayan',
    'Vaccines are tested for safety before use. Talk to your health worker at the barangay clinic about the schedule for your family.',
    'Real: it explains a fact and points to your health worker.',
  ),
];

/**
 * Step 2 and 5: the same eight posts test the detector before and after the fix.
 * Two English posts, four Taglish and Cebuano fakes, and two local-language real posts.
 */
export const TEST_POSTS: readonly TuruanPost[] = [
  post(
    'tu-x01',
    'en',
    'fake',
    'Herbal Himala Page',
    'Miracle herb cures cancer in one week! Doctors hate this secret. Share now!',
    'Fake: miracle cure, secret and "share now".',
  ),
  post(
    'tu-x02',
    'tl',
    'fake',
    'Totoo Ito Network',
    'Totoo ito! Sabi ng doctor sa ospital, ang bawang ay gamot sa dengue. Official health report daw, ipasa na!',
    'Fake: nobody is named, and garlic does not cure dengue. It borrows English words that sound official.',
  ),
  post(
    'tu-x03',
    'en',
    'real',
    'Health Center Paalala',
    'Health workers advise washing your hands with soap and water. Visit the clinic for free vaccines.',
    'Real: simple advice from health workers.',
  ),
  post(
    'tu-x04',
    'tl',
    'fake',
    'Dahon ng Himala',
    'Pinatunayan ng health workers na gamot sa lahat ng sakit ang dahon ng sambong. Walang side effects at libre pa sa clinic!',
    'Fake: one leaf for every illness and "no side effects" is too good to be true.',
  ),
  post(
    'tu-x05',
    'ceb',
    'fake',
    'Tambal Diretso',
    'Dili na kinahanglan moadto sa health center: ang tsaa sa bayabas makaayo dayon sa diabetes. Ipakaylap na ni!',
    'Fake: tea cannot cure diabetes, and "skip the health center" is dangerous.',
  ),
  post(
    'tu-x06',
    'tl',
    'real',
    'Paalala ng Barangay',
    'Paalala ng DOH: maghugas ng kamay gamit ang sabon at tubig. Magpabakuna sa health center.',
    'Real: DOH advice to wash hands and get vaccinated.',
  ),
  post(
    'tu-x07',
    'ceb',
    'fake',
    'Pasidaan Karon',
    'Ang vaccines gitago sa gobyerno nga makahimo og sakit sa mga bata. Ipakaylap na!',
    'Fake: a hidden-truth story with no proof, and vaccines are tested for safety.',
  ),
  post(
    'tu-x08',
    'ceb',
    'real',
    'Panglawas sa Barangay',
    'Kung adunay hilanat sulod sa tulo ka adlaw, adtoa ang health worker sa inyong barangay.',
    'Real: see a health worker for a fever that lasts.',
  ),
];

/** Step 4: six local-language posts (three Taglish, three Cebuano) the player labels to teach the detector new words. */
export const LOCAL_POSTS: readonly TuruanPost[] = [
  post(
    'tu-l01',
    'tl',
    'fake',
    'Bawang Bayani',
    'Sigurado! Ang bawang ay gamot sa lahat ng sakit. Ipasa na ito sa lahat bago tanggalin!',
    'Fake: "sure cure for every illness" and a rush to pass it on.',
  ),
  post(
    'tu-l02',
    'tl',
    'real',
    'Health Worker ng Bayan',
    'Paalala: magpakonsulta sa health worker sa inyong barangay kung may lagnat na mahigit tatlong araw.',
    'Real: a fever that lasts goes to a health worker.',
  ),
  post(
    'tu-l03',
    'tl',
    'fake',
    'Lihim ng Gobyerno',
    'Tinatago ng gobyerno ang gamot sa sakit. Libre at walang side effects ang dahon na ito, ipasa mo!',
    'Fake: a hidden-cure story and "no side effects".',
  ),
  post(
    'tu-l04',
    'ceb',
    'fake',
    'Bayabas Himala',
    'Ang tsaa sa bayabas tambal sa tanang sakit, sigurado ug libre! Ipakaylap ni sa tanan.',
    'Fake: one tea for every illness and a push to spread it.',
  ),
  post(
    'tu-l05',
    'ceb',
    'real',
    'Health Center sa Lungsod',
    'Hugasi ang imong kamot gamit ang sabon ug tubig. Adtoa ang health center para sa libreng bakuna sa bata.',
    'Real: handwashing and free vaccines at the health center.',
  ),
  post(
    'tu-l06',
    'ceb',
    'real',
    'Pangutan-a ang Doktor',
    'Pangutan-a ang doktor o health worker kung luwas ba ang tambal sa imong sakit.',
    'Real: ask a doctor or health worker if a medicine is safe.',
  ),
];
