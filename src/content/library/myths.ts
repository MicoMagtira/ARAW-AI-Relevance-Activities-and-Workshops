// Library: Myths (Kwentong Kalusugan), docs/SPEC.md section 8 and docs/CONTENT_GUIDE.md sections 3 and 6.
// Facts come only from the guide's safe facts list. No dosing, no diagnosis: every card points to people who can help.
// "Why people believe it" is always kind: people share myths out of care. Mock the trick (the villain), never the person.
import type { ModuleTag } from '../factOrFake/schema';
import type { VillainId } from '../tactics';

export const MYTH_TOPICS = ['dengue', 'outbreaks', 'hiv', 'medicines', 'vaccines', 'chronic', 'everyday', 'online', 'healthai'] as const;
export type MythTopic = (typeof MYTH_TOPICS)[number];

/** Filter chip labels for the Library. */
export const MYTH_TOPIC_LABELS: Record<MythTopic, string> = {
  dengue: 'Dengue and mosquitoes',
  outbreaks: 'Coughs, flu and outbreaks',
  hiv: 'HIV',
  medicines: 'Medicines',
  vaccines: 'Vaccines',
  chronic: 'BP, sugar and cancer',
  everyday: 'Everyday health',
  online: 'AI and online',
  healthai: 'AI in health care',
};

/**
 * The DOST-NICER program project a myth relates to (docs/CONTENT_GUIDE.md section 10). Internal tag for reports and
 * review only; the player UI does not show it. `null` when no project fits.
 */
export const MYTH_PROGRAMS = ['healthph', 'advocaid', 'mosquito', 'aikasalig'] as const;
export type MythProgram = (typeof MYTH_PROGRAMS)[number];

export const MYTH_PROGRAM_LABELS: Record<MythProgram, string> = {
  healthph: 'HealthPH+',
  advocaid: 'AdvocAid PH',
  mosquito: 'Mosquito Density and Disease Outbreak Prediction',
  aikasalig: 'AIKasalig',
};

export interface Myth {
  id: string;
  topic: MythTopic;
  /** Card front: the myth as people say it (under 70 characters). */
  myth: string;
  /** Card back: the fact (under 120 characters). */
  fact: string;
  /** Why people believe it: empathetic, never shaming (at most 40 words). */
  why: string;
  /** How to check: one concrete step (at most 25 words). */
  check: string;
  /** The villain trick chip on the card back. */
  villain: VillainId;
  /** "Related module" link. */
  module: ModuleTag;
  /** Source or rationale for the fact. */
  basis: string;
  /** DOST-NICER project this myth ties to, or null (not shown to players). */
  program: MythProgram | null;
  review_status: 'unreviewed';
}

const myth = (
  id: string,
  topic: MythTopic,
  villain: VillainId,
  module: ModuleTag,
  program: MythProgram | null,
  text: { myth: string; fact: string; why: string; check: string; basis: string },
): Myth => ({ id, topic, ...text, villain, module, program, review_status: 'unreviewed' });

export const MYTHS: readonly Myth[] = [
  // Dengue and mosquitoes
  myth('tawa-tawa-dengue', 'dengue', 'miracle_mike', 'm04', 'mosquito', {
    myth: 'Tawa-tawa cures dengue.',
    fact: 'No herb is proven to cure dengue. If you have a high fever, see a health worker early.',
    why: 'Tawa-tawa is a remedy passed down with love, and many families tried it while someone got better. When a child is sick, we want to do something.',
    check: 'Ask your health worker. Watch for dengue warning signs and go to the hospital if they appear.',
    basis: 'WHO dengue fact sheet; CONTENT_GUIDE safe facts: no herbal cure for dengue',
  }),
  myth('papaya-leaf-dengue', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'Papaya leaf juice is the real cure for dengue.',
    fact: 'Papaya leaf is not a proven dengue cure. Care means fluids and close watch by health workers.',
    why: 'Stories of a neighbour who drank it and recovered spread fast. Most people with dengue do recover, so the juice gets the credit.',
    check: 'Do not let a remedy delay a check-up. Go to the health center early and ask about warning signs.',
    basis: 'WHO dengue fact sheet; CONTENT_GUIDE safe facts: no herbal cure for dengue',
  }),
  myth('dengue-night-bites', 'dengue', 'kwento_kim', 'm06', 'mosquito', {
    myth: 'Dengue mosquitoes only bite at night.',
    fact: 'Aedes mosquitoes, which spread dengue, bite mostly in the daytime.',
    why: 'We sleep under a mosquito net at night and hear mosquitoes buzz in the dark, so night feels like the danger time.',
    check: 'Check DOH dengue pages or ask your barangay health worker about daytime protection.',
    basis: 'WHO dengue fact sheet (Aedes day-biting); DOH 4S',
  }),
  myth('dengue-dirty-water', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'Dengue mosquitoes breed only in dirty water.',
    fact: 'They breed in clean standing water. Cover, clean and empty containers every week.',
    why: 'Dirty canals look like the obvious problem. A clean flower pot or a drum of rain water does not look dangerous at all.',
    check: 'Search your home for standing water this week. Ask your health worker about DOH\'s 4S.',
    basis: 'WHO dengue fact sheet; DOH 4S (search and destroy breeding places)',
  }),
  myth('fogging-is-enough', 'dengue', 'kwento_kim', 'm05', 'mosquito', {
    myth: 'Fogging is all we need to stop dengue.',
    fact: 'Fogging helps only in hotspot areas. Emptying standing water every week matters most.',
    why: 'Fogging is loud and visible, so it feels like strong action. Cleaning containers is quiet work that nobody sees.',
    check: 'Ask your barangay health worker about the 4S: search, secure, seek early, support fogging only in hotspot areas.',
    basis: 'DOH 4S strategy',
  }),

  // Medicines
  myth('antibiotics-colds', 'medicines', 'kwento_kim', 'm03', 'healthph', {
    myth: 'Antibiotics cure colds and flu.',
    fact: 'Colds and flu come from viruses. Antibiotics only work on bacteria. Ask a health worker first.',
    why: 'Someone once felt better after antibiotics, so it seemed to work. Colds often get better on their own around that time anyway.',
    check: 'Ask a doctor or health worker before taking any antibiotic. Use them only when prescribed.',
    basis: 'WHO antimicrobial resistance fact sheet',
  }),
  myth('stop-antibiotics-early', 'medicines', 'kwento_kim', 'm03', null, {
    myth: 'Stop antibiotics once you feel better and save the rest.',
    fact: 'Use antibiotics exactly as a health worker says. Misuse helps germs become resistant.',
    why: 'Feeling better feels like being done, and saving medicine for next time seems thrifty and smart.',
    check: 'Ask your doctor or pharmacist how long to take it before you start.',
    basis: 'WHO antimicrobial resistance fact sheet',
  }),
  myth('tea-replaces-meds', 'medicines', 'miracle_mike', 'm04', null, {
    myth: 'A herbal tea can replace your maintenance meds.',
    fact: 'Do not stop or change maintenance medicines without talking to your doctor.',
    why: 'Taking pills every day is tiring and costly. A natural tea that promises freedom from pills sounds like a gift.',
    check: 'Bring the tea and your questions to your doctor or barangay health center before changing anything.',
    basis: 'CONTENT_GUIDE safe facts: do not stop maintenance medicines without your doctor',
  }),
  myth('natural-is-safe', 'medicines', 'miracle_mike', 'm04', null, {
    myth: 'If it is natural, it is always safe.',
    fact: 'Natural does not mean safe. Some herbs can harm you or clash with medicines.',
    why: 'Plants from the garden feel gentle and familiar, and our elders used them. Factory pills feel strong and strange.',
    check: 'Tell your health worker about every herb or supplement you take, together with your medicines.',
    basis: 'WHO traditional medicine guidance; CONTENT_GUIDE safe facts',
  }),
  myth('supplement-is-medicine', 'medicines', 'miracle_mike', 'm04', null, {
    myth: 'A food supplement can cure your illness.',
    fact: 'Supplements are not medicine. In the Philippines their labels must say "No approved therapeutic claims".',
    why: 'Supplement ads look like medicine ads, with doctors, charts and happy families. It is hard to tell them apart.',
    check: 'Read the label for "No approved therapeutic claims" and check the FDA Philippines verification portal.',
    basis: 'FDA Philippines rules on food supplement labelling',
  }),
  myth('fda-number-means-cure', 'medicines', 'dr_fake', 'm04', null, {
    myth: 'An FDA number means it cures whatever the ad says.',
    fact: 'Registration is not proof of every claim. Health claims on supplements are a red flag.',
    why: 'An official-looking number feels like a stamp of approval for the whole ad, not just the product.',
    check: 'Look up the product on the FDA Philippines portal and compare what it is registered as.',
    basis: 'FDA Philippines verification portal; food supplement labelling rules',
  }),

  // Vaccines (blame-free)
  myth('vaccines-not-checked', 'vaccines', 'conspiracy_kuya', 'm05', null, {
    myth: 'Vaccines are never checked after they come out.',
    fact: 'Vaccines are tested in large studies and monitored after approval. Side effects are reported and reviewed.',
    why: 'We rarely see the safety work, so it is easy to think nobody is watching. Worry about our children is natural.',
    check: 'Ask your health worker how side effects are reported. Look at DOH vaccine pages.',
    basis: 'WHO vaccine safety monitoring; CONTENT_GUIDE vaccine framing',
  }),
  myth('vaccine-fever-danger', 'vaccines', 'fear_monger', 'm04', null, {
    myth: 'A fever after a vaccine means it is dangerous.',
    fact: 'Most side effects are mild and short, like a sore arm or mild fever. Serious ones are rare.',
    why: 'Seeing your child feverish is scary, and scary stories get shared more than calm ones.',
    check: 'Ask the health center what reactions are normal and which signs mean you should come back.',
    basis: 'WHO vaccine safety Q&A; CONTENT_GUIDE vaccine framing',
  }),
  myth('vaccines-only-if-you-pay', 'vaccines', 'conspiracy_kuya', 'm05', null, {
    myth: 'Good vaccines are only for people who can pay.',
    fact: 'Routine childhood vaccines are available free at health centers.',
    why: 'Many things that matter cost money, so free can feel like second-best. Not everyone hears about free programs.',
    check: 'Visit or call your barangay health center and ask for the childhood vaccine schedule.',
    basis: 'DOH national immunization program',
  }),
  myth('share-vaccine-warnings', 'vaccines', 'fear_monger', 'm05', 'healthph', {
    myth: 'Sharing every vaccine warning keeps my family safe.',
    fact: 'Fear spreads faster than facts. Checking with a health worker first is a caring habit.',
    why: 'Forwarding a warning feels like protecting the people we love. Nobody wants to be the one who stayed quiet.',
    check: 'Pause before sharing. Ask a health worker or check an independent fact-checker first.',
    basis: 'CONTENT_GUIDE vaccine framing: fear spreads faster than facts',
  }),

  // Blood pressure, diabetes, cancer
  myth('high-bp-you-feel-it', 'chronic', 'kwento_kim', 'm03', null, {
    myth: 'You will feel it if your blood pressure is high.',
    fact: 'High blood pressure often has no symptoms. Regular checks at the health center help.',
    why: 'Some people do get headaches, so it makes sense to wait for a sign. Feeling fine feels like being fine.',
    check: 'Get your blood pressure checked at the barangay health center, even when you feel well.',
    basis: 'WHO hypertension fact sheet',
  }),
  myth('ampalaya-cures-diabetes', 'chronic', 'kwento_kim', 'm03', null, {
    myth: 'Ampalaya tea cures diabetes.',
    fact: 'Ampalaya is a healthy vegetable, but there is no proven herbal cure for diabetes.',
    why: 'Ampalaya is bitter and good for us, and many grandparents swear by it. It feels like strong medicine.',
    check: 'Keep your prescribed medicine and ask your doctor before adding any herbal product.',
    basis: 'CONTENT_GUIDE safe facts: no proven herbal cure for diabetes',
  }),
  myth('herbal-cancer-cure', 'chronic', 'conspiracy_kuya', 'm04', null, {
    myth: 'A secret herbal mix cures cancer, but doctors hide it.',
    fact: 'There is no proven herbal cure for cancer. Early check-ups and screening help.',
    why: 'Cancer is frightening and treatment is hard. A gentle secret cure gives hope when we need it most.',
    check: 'Ask where the evidence is. Bring the claim to a doctor and check an independent fact-checker.',
    basis: 'WHO cancer fact sheet; CONTENT_GUIDE safe facts',
  }),
  myth('cured-means-stop', 'chronic', 'kwento_kim', 'm02', null, {
    myth: 'Once my BP is normal, I can stop my maintenance meds.',
    fact: 'A normal reading often means the medicine is working. Ask your doctor before any change.',
    why: 'A good reading feels like being cured. It is natural to hope the pills are no longer needed.',
    check: 'Bring your readings to your doctor and ask what they mean for your medicine.',
    basis: 'CONTENT_GUIDE safe facts: do not stop maintenance medicines without your doctor',
  }),

  // Everyday health
  myth('pasma-washing-hands', 'everyday', 'kwento_kim', 'm05', null, {
    myth: 'Washing hands after hard work causes pasma, a hand ailment.',
    fact: 'Washing with soap and water helps prevent infections. If hand pain or shaking continues, see a health worker.',
    why: 'Pasma is a folk belief our elders passed down to protect us. Tired, aching hands after work are real, and the warning comes from care.',
    check: 'Keep washing with soap and water. Ask your health worker about hand pain that does not go away.',
    basis: 'WHO hand hygiene guidance; respectful handling of pasma per CONTENT_GUIDE',
  }),
  myth('long-cough-normal', 'everyday', 'kwento_kim', 'm03', 'healthph', {
    myth: 'A cough that lasts for weeks is just a normal cough.',
    fact: 'A cough of 2 weeks or more should be checked for TB. TB is curable, with free treatment.',
    why: 'Coughs are common, and nobody wants to bother the health center for "just a cough".',
    check: 'Go to the barangay health center and ask for a TB check if a cough lasts 2 weeks.',
    basis: 'WHO tuberculosis fact sheet; DOH TB program',
  }),
  myth('animal-bite-home-remedy', 'everyday', 'kwento_kim', 'm03', null, {
    myth: 'A home remedy is enough for a small dog bite.',
    fact: 'Wash the wound with soap and running water, then go to an animal bite center right away.',
    why: 'Small bites look harmless, and traditional healers are close and trusted. The pet may be family too.',
    check: 'Go to the nearest animal bite center the same day. Rabies is preventable but deadly once symptoms start.',
    basis: 'WHO rabies fact sheet; DOH animal bite centers',
  }),
  myth('flood-water-harmless', 'everyday', 'kwento_kim', 'm06', 'mosquito', {
    myth: 'Flood water is harmless if you feel fine after.',
    fact: 'Wading in flood water raises leptospirosis risk. See a health worker after exposure.',
    why: 'During floods we wade because we must. Feeling fine the next day makes it seem like nothing happened.',
    check: 'Tell your health worker you waded in flood water, even if you feel fine.',
    basis: 'WHO leptospirosis guidance; DOH flood advisories',
  }),
  myth('diarrhea-no-fluids', 'everyday', 'kwento_kim', 'm03', null, {
    myth: 'Drink less during diarrhea so it stops sooner.',
    fact: 'ORS helps prevent dehydration from diarrhea. See a health worker for danger signs.',
    why: 'Less going in seems like less coming out. It is a logical guess when you are tired and worried.',
    check: 'Ask your health center about ORS and the danger signs of dehydration in children.',
    basis: 'WHO diarrhoeal disease fact sheet (ORS)',
  }),
  myth('clear-water-safe', 'everyday', 'kwento_kim', 'm01', null, {
    myth: 'If water looks clear, it is safe to drink.',
    fact: 'Clear water can still carry germs. Bringing it to a rolling boil makes it safer.',
    why: 'We judge with our eyes, and clean-looking water from a familiar source feels safe.',
    check: 'Ask your barangay health worker if your water source is safe, or boil it when unsure.',
    basis: 'WHO drinking-water guidance',
  }),
  myth('vape-just-water', 'everyday', 'miracle_mike', 'm08', null, {
    myth: 'Vaping is harmless because it is just water vapour.',
    fact: 'Smoking and vaping both harm the lungs and heart.',
    why: 'Vapes smell sweet and look like a clean mist, and they are often sold as the safer choice.',
    check: 'Ask your health worker about vaping, or look at DOH pages on tobacco and vapes.',
    basis: 'WHO tobacco and e-cigarette fact sheets',
  }),
  myth('teens-need-less-sleep', 'everyday', 'kwento_kim', 'm08', null, {
    myth: 'Teens are young and strong, so they need less sleep.',
    fact: 'Teens need more sleep than adults. Sleep supports mood, memory and the immune system.',
    why: 'Teens seem full of energy late at night, and adults remember pulling all-nighters too.',
    check: 'Ask a health worker or school nurse how much sleep a teen needs.',
    basis: 'WHO adolescent health guidance; sleep and wellbeing consensus',
  }),

  // AI and online
  myth('forwarded-many-times', 'online', 'fear_monger', 'm05', 'healthph', {
    myth: 'If a message was forwarded many times, it must be true.',
    fact: 'Many shares do not make a claim true. Check the source before you forward.',
    why: 'When many people we trust share something, it feels checked already. Sharing is how we care for each other.',
    check: 'Find who first said it. Look for a second trusted source, like DOH or a fact-checker.',
    basis: 'Media literacy consensus; independent fact-checking practice',
  }),
  myth('chatbot-always-right', 'online', 'dr_fake', 'm03', 'aikasalig', {
    myth: 'A chatbot always tells the truth.',
    fact: 'Chatbots can sound sure and still be wrong. Check health answers with a health worker.',
    why: 'Chatbots answer fast, in neat sentences, with a confident tone. That sounds like an expert.',
    check: 'Ask the same question to a health worker, or check a DOH or WHO page.',
    basis: 'CONTENT_GUIDE AI facts: AI can be confidently wrong (hallucination)',
  }),
  myth('chatbot-can-diagnose', 'online', 'dr_fake', 'm03', 'aikasalig', {
    myth: 'A health chatbot can diagnose me like a doctor.',
    fact: 'Chatbots cannot examine you and are not doctors. They can help you prepare questions.',
    why: 'Clinics can be far and busy, and the chatbot is always awake. It feels like a doctor in your pocket.',
    check: 'Use the chatbot to write your questions, then bring them to a health worker. Skip your full name and ID numbers.',
    basis: 'CONTENT_GUIDE AI facts: chatbots are not doctors',
  }),
  myth('doctor-in-ad-proves-it', 'online', 'dr_fake', 'm07', 'aikasalig', {
    myth: 'If a doctor is in the video ad, the product works.',
    fact: 'Doctor videos can be faked with AI. A real doctor selling a miracle product is a red flag.',
    why: 'We were taught to respect doctors. A familiar white coat and a calm voice feel trustworthy.',
    check: 'Look for the doctor\'s own official page and the product\'s FDA registration.',
    basis: 'CONTENT_GUIDE AI facts: deepfaked doctor endorsements',
  }),
  myth('spot-fakes-by-glitches', 'online', 'dr_fake', 'm07', 'aikasalig', {
    myth: 'You can always spot a fake video by its glitches.',
    fact: 'AI fakes can look and sound real. Checking the source works better than hunting glitches.',
    why: 'Early fakes had odd blinking and blurry mouths, and tips for spotting them went viral.',
    check: 'Ask who posted it first, and look for the same news on an official page.',
    basis: 'CONTENT_GUIDE AI facts: spotting glitches is unreliable',
  }),
  myth('deleted-means-true', 'online', 'conspiracy_kuya', 'm05', 'healthph', {
    myth: 'If "they" deleted the post, it must be true.',
    fact: 'Posts are removed for many reasons, including false health claims. Removal is not proof.',
    why: 'Being told something is hidden makes it feel precious. Nobody likes the feeling of being kept in the dark.',
    check: 'Search an independent fact-checker for the claim before you repost it.',
    basis: 'Platform policies on health misinformation; fact-checking practice',
  }),
  myth('ai-powered-is-better', 'online', 'miracle_mike', 'm01', 'aikasalig', {
    myth: 'An "AI-powered" health product must be smarter and safer.',
    fact: '"AI-powered" is often just a sales label. Ask what it does and whether it is proven.',
    why: 'AI is in the news every day, so the word sounds modern and impressive.',
    check: 'Ask the seller what the AI actually does, and check the product with the FDA portal.',
    basis: 'Module 1 lesson on AI hype; FDA Philippines verification portal',
  }),
  myth('phone-is-listening', 'online', 'conspiracy_kuya', 'm01', 'aikasalig', {
    myth: 'My phone shows tea ads because it secretly listens to me.',
    fact: 'Apps learn patterns from what you tap, watch and search, then guess what to show you.',
    why: 'The ads can feel spookily on point, right after we talked about something. Of course it feels like listening.',
    check: 'Open the app\'s ad settings to see why an ad was shown, and review app permissions.',
    basis: 'Module 1 lesson: AI learns patterns from examples to make guesses',
  }),

  // Expansion 2026-10-16 (sources in planning/01_references.md, "Library myths expansion")
  // Dengue and mosquitoes
  myth('dengue-only-once', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'I already had dengue, so I cannot get it again.',
    fact: 'There are four types of dengue virus. A second infection can be more severe, so stay careful.',
    why: 'After a hard bout of dengue, it feels fair to think the body is now protected. Some illnesses, like chickenpox, usually come only once.',
    check: 'Keep up the 4S at home. If a fever comes back, see a health worker early and mention your past dengue.',
    basis: 'WHO fact sheet: Dengue and severe dengue (2025): a second infection raises the risk of severe dengue',
  }),
  myth('dengue-fever-gone', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'Once the fever breaks, dengue is over.',
    fact: 'Severe dengue signs often appear after the fever goes away. Keep watching for warning signs.',
    why: 'A falling fever is usually the best news a family can get. After days of worry, everyone is ready to rest.',
    check: 'Ask your health worker which warning signs to watch for. Go to the hospital at once if any appear.',
    basis: 'WHO fact sheet: Dengue and severe dengue (2025): severe symptoms often come after the fever has gone',
  }),
  myth('dengue-any-pain-reliever', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'Any pain reliever at home is fine for a dengue fever.',
    fact: 'Some common pain relievers can raise bleeding risk in dengue. Ask a health worker before taking any.',
    why: 'Pain relievers are in almost every home, and we reach for them at every fever. It feels like the fastest way to help.',
    check: 'Call or visit your health center before giving any medicine for a fever that might be dengue.',
    basis: 'WHO fact sheet: Dengue and severe dengue (2025): avoid anti-inflammatory pain relievers because of bleeding risk',
  }),
  myth('dengue-rainy-season-only', 'dengue', 'kwento_kim', 'm05', 'mosquito', {
    myth: 'Dengue is only a problem during the rainy season.',
    fact: 'Dengue can spread all year. Cases peak in the rainy months, so empty water containers every week.',
    why: 'Dengue news comes mostly with the rains, so the dry months feel safe. Good habits are easy to drop when the danger seems gone.',
    check: 'Search your home for standing water every week, all year. Ask your barangay health worker about dengue nearby.',
    basis: 'WHO fact sheet: Dengue and severe dengue (2025); DOH statements on year-round dengue (2025)',
  }),

  // Medicines
  myth('share-leftover-antibiotics', 'medicines', 'kwento_kim', 'm03', null, {
    myth: 'Leftover antibiotics can be shared with a sick family member.',
    fact: 'Antibiotics are chosen for one person and one infection. Sharing them can harm and fuel resistance.',
    why: 'Sharing medicine feels like caring, and it saves money. If it helped one person, it seems sure to help another.',
    check: 'Do not share or save antibiotics. Ask a pharmacist how to throw away leftovers safely.',
    basis: 'WHO fact sheet: Antimicrobial resistance (2026); CDC Healthy Habits: Antibiotic Do\'s and Don\'ts',
  }),
  myth('generics-are-weaker', 'medicines', 'kwento_kim', 'm04', null, {
    myth: 'Generic medicines are weaker than branded ones.',
    fact: 'Registered generics have the same active ingredient as the brand and must meet quality standards.',
    why: 'We often think a higher price means better quality. A familiar name on the box feels more trustworthy than a plain label.',
    check: 'Ask your doctor or pharmacist about a registered generic. You can check registration on the FDA Philippines portal.',
    basis: 'Generics Act of 1988 (RA 6675); US FDA: Generic Drug Facts; FDA Philippines verification portal',
  }),
  myth('online-medicine-same', 'medicines', 'miracle_mike', 'm04', null, {
    myth: 'Medicine from any online seller is the same as from a pharmacy.',
    fact: 'Fake and substandard medicines are often sold online. Buy from licensed pharmacies.',
    why: 'Online shops are cheap and close at hand, and the boxes look just like the real ones. For many families, the pharmacy is far.',
    check: 'Check the product on the FDA Philippines portal and buy from a licensed pharmacy. Ask your pharmacist when unsure.',
    basis: 'WHO fact sheet: Substandard and falsified medical products (2024)',
  }),
  myth('more-vitamins-better', 'medicines', 'miracle_mike', 'm04', null, {
    myth: 'The more vitamins you take, the healthier you get.',
    fact: 'Too much of some vitamins and minerals can harm you. Supplements do not replace a varied diet.',
    why: 'Vitamins sound like pure goodness, and ads promise energy and strong immunity. More of a good thing feels even better.',
    check: 'Show your health worker every vitamin and supplement you take, and ask whether you really need it.',
    basis: 'NIH Office of Dietary Supplements: Dietary Supplements, What You Need to Know (consumer fact sheet)',
  }),

  // Vaccines (blame-free)
  myth('vaccines-cause-autism', 'vaccines', 'conspiracy_kuya', 'm05', null, {
    myth: 'Vaccines cause autism.',
    fact: 'Many large studies, reviewed again by WHO safety experts in 2025, show vaccines do not cause autism.',
    why: 'Signs of autism often show up around the age children get vaccines, so the timing feels connected. Parents want answers, and that worry comes from love.',
    check: 'Bring your worries to your health worker. Check WHO or DOH vaccine safety pages, not forwarded posts.',
    basis: 'WHO GACVS statement on vaccines and autism (December 2025)',
  }),
  myth('measles-natural-better', 'vaccines', 'miracle_mike', 'm04', 'healthph', {
    myth: 'Catching measles naturally is better than getting the vaccine.',
    fact: 'Measles can cause pneumonia, blindness, brain swelling and death. The vaccine protects without those risks.',
    why: '"Natural" sounds gentle and strong, and many older relatives had measles as kids and got through it. Those memories feel like proof.',
    check: 'Ask your barangay health center about measles vaccines for your child. They are free.',
    basis: 'WHO fact sheet: Measles (2026); DOH national immunization program',
  }),
  myth('too-many-vaccines-at-once', 'vaccines', 'fear_monger', 'm05', null, {
    myth: 'Too many vaccines at once will overload a baby.',
    fact: 'Babies meet many germs every day. Vaccines given together are tested and do not overload the immune system.',
    why: 'Watching a small baby get several shots in one visit is hard for any parent. Wanting to protect them is natural.',
    check: 'Ask your health worker why the vaccines are given together and what to expect after the visit.',
    basis: 'Gavi VaccinesWork: Do multiple vaccines overload a child\'s immune system? (2025)',
  }),
  myth('vaccines-only-for-kids', 'vaccines', 'kwento_kim', 'm05', 'healthph', {
    myth: 'Vaccines are only for babies and children.',
    fact: 'Some vaccines, like flu and pneumonia vaccines, are also advised for seniors and some adults.',
    why: 'Most vaccine talk is about babies, and many adults have not had a shot since school. It is easy to think we are done.',
    check: 'Ask your barangay health center which vaccines are advised for you, especially if you are 60 or older.',
    basis: 'WHO position paper: Vaccines against influenza (2022); Expanded Senior Citizens Act (RA 9994)',
  }),

  // Blood pressure, diabetes, cancer
  myth('cervical-cancer-unpreventable', 'chronic', 'fear_monger', 'm03', null, {
    myth: 'Cervical cancer cannot be prevented.',
    fact: 'Most cervical cancer can be prevented with HPV vaccination and regular screening.',
    why: 'Cancer can feel like bad luck that nobody controls. Fear makes many of us avoid check-ups, even the ones that could help.',
    check: 'Ask your health center about the HPV vaccine for girls and cervical screening for women.',
    basis: 'WHO fact sheet: Cervical cancer (2026)',
  }),
  myth('biopsy-spreads-cancer', 'chronic', 'kwento_kim', 'm03', null, {
    myth: 'A biopsy or an operation makes cancer spread.',
    fact: 'The chance that surgery spreads cancer is extremely low. Delaying care gives cancer time to grow.',
    why: 'Someone we knew may have gotten worse after an operation, and the story stuck. The cancer was often already advanced, but the operation got the blame.',
    check: 'Share your worries with your doctor before deciding. Bring a family member to help you ask questions.',
    basis: 'US National Cancer Institute: Common Cancer Myths and Misconceptions (2024)',
  }),
  myth('diabetes-only-sweets', 'chronic', 'kwento_kim', 'm03', null, {
    myth: 'Only people who eat a lot of sweets get diabetes.',
    fact: 'Type 2 diabetes is linked to weight, little exercise and family history, not just sweets.',
    why: 'Diabetes is often just called "sugar", so it makes sense to blame sweets. People who skip dessert may feel safe.',
    check: 'Ask your barangay health center for a blood sugar check, especially if diabetes runs in your family.',
    basis: 'WHO fact sheet: Diabetes (2024)',
  }),
  myth('maintenance-meds-kidneys', 'chronic', 'fear_monger', 'm04', null, {
    myth: 'Maintenance medicines will ruin your kidneys.',
    fact: 'Uncontrolled high blood pressure and sugar harm the kidneys. Ask your doctor before changing any medicine.',
    why: 'Taking pills every day for years is worrying, and many families know someone on dialysis. Fearing the medicine is understandable.',
    check: 'Bring your kidney worries to your doctor. Ask about check-ups that watch your kidneys while you take medicine.',
    basis: 'WHO fact sheets: Hypertension (2025) and Diabetes (2024)',
  }),
  myth('stroke-prick-fingers', 'chronic', 'fear_monger', 'm05', null, {
    myth: 'Pricking the fingertips can save someone having a stroke.',
    fact: 'A stroke is an emergency. Get the person to a hospital right away; pricking fingers only wastes time.',
    why: 'In a scary moment, a simple trick feels like something we can do with our own hands. The tip is often shared as a life-saver.',
    check: 'Learn the signs: face drooping, arm weakness, speech trouble. If you see them, go to the hospital at once.',
    basis: 'CONTENT_GUIDE red flags (stroke signs); American Stroke Association F.A.S.T. warning signs; Full Fact check on pin-prick stroke claims',
  }),

  // Everyday health
  myth('depression-weak-mind', 'everyday', 'kwento_kim', 'm08', null, {
    myth: 'Depression is just a weak mind. Be strong and it will pass.',
    fact: 'Depression is a common health condition, not weakness. It can be treated, and help is available.',
    why: 'Many of us were raised to endure hardship quietly. Saying "be strong" is how families try to lift each other up.',
    check: 'Talk to a health worker or someone you trust. For thoughts of self-harm, call the crisis hotline 1553 now.',
    basis: 'WHO fact sheet: Depressive disorder (2026); NCMH crisis hotline 1553',
  }),
  myth('deworm-only-if-worms', 'everyday', 'kwento_kim', 'm03', null, {
    myth: 'Children only need deworming if you can see worms.',
    fact: 'Worm infections often show no signs. Free deworming at school and health centers protects children.',
    why: 'If a child looks healthy and eats well, there seems to be nothing to treat. Worms are not something families like to talk about.',
    check: 'Ask your barangay health center or school about the free deworming schedule for your child.',
    basis: 'WHO fact sheet: Soil-transmitted helminth infections (2023); DOH school deworming program',
  }),
  myth('formula-smarter-babies', 'everyday', 'miracle_mike', 'm04', null, {
    myth: 'Formula milk makes babies smarter than breast milk.',
    fact: 'Breast milk is the best first food and protects babies from infections. Health workers can help.',
    why: 'Formula ads show bright, strong babies, and many moms worry their milk is not enough. Wanting the best for a baby is love.',
    check: 'Ask your health center or a breastfeeding counselor for help, especially if breastfeeding feels hard.',
    basis: 'WHO fact sheet: Infant and young child feeding (2026)',
  }),
  myth('heat-stroke-only-elderly', 'everyday', 'kwento_kim', 'm03', null, {
    myth: 'Only the elderly can get heat stroke.',
    fact: 'Anyone can get heat stroke, including young workers and athletes. It is a medical emergency.',
    why: 'Heat warnings usually mention lolos and lolas. Young people feel strong and used to the sun.',
    check: 'Drink water, rest in the shade and check on others. Get help fast if someone becomes confused or faints.',
    basis: 'WHO fact sheet: Climate change, heat and health (2026)',
  }),
  myth('tb-runs-in-family', 'everyday', 'kwento_kim', 'm03', 'healthph', {
    myth: 'TB runs in the family, so it is passed down by blood.',
    fact: 'TB spreads through the air when a sick person coughs. It is preventable and curable, with free treatment.',
    why: 'TB often shows up in several people in one home, so it looks inherited. Living close together is the real reason.',
    check: 'If someone at home has TB, ask the health center to check the rest of the household.',
    basis: 'WHO fact sheet: Tuberculosis (2026); DOH TB program',
  }),

  // AI and online
  myth('cloned-voice-hospital-money', 'online', 'fear_monger', 'm07', 'aikasalig', {
    myth: 'A call in my child\'s voice asking for hospital money is real.',
    fact: 'Voices can be cloned with AI. Hang up and call the person back on a number you know.',
    why: 'Hearing a loved one in trouble makes the heart race. Scammers count on that love and rush you before you can think.',
    check: 'Call back on a saved number or ask a family question only they would know. Report scams to hotline 1326.',
    basis: 'US FTC consumer alert: Scammers use AI to enhance their family emergency schemes (2023); CICC hotline 1326',
  }),
  myth('happy-comments-prove-it', 'online', 'kwento_kim', 'm04', 'healthph', {
    myth: 'Hundreds of happy comments prove a product works.',
    fact: 'Comments and reviews can be fake or paid. Many stories together are still not evidence.',
    why: 'When many people seem happy, it feels safe to join them. Stories from people like us feel more real than studies.',
    check: 'Check the product on the FDA Philippines portal and ask a health worker instead of trusting the comments.',
    basis: 'US FTC Rule on the Use of Consumer Reviews and Testimonials (2024); CONTENT_GUIDE Kwento Kim trick',
  }),
  myth('cures-many-diseases', 'online', 'miracle_mike', 'm04', 'healthph', {
    myth: 'A product that cures many diseases at once is a breakthrough.',
    fact: 'Claiming to cure many unrelated diseases is a classic warning sign, not a breakthrough.',
    why: 'Living with several illnesses is tiring and costly. One product for everything sounds like the answer to a prayer.',
    check: 'Check the product on the FDA Philippines portal, and look for "No approved therapeutic claims" on the label.',
    basis: 'US FDA: Health Fraud Scams ("one product does it all" red flag); CONTENT_GUIDE Miracle Mike signs',
  }),
  myth('chatbot-chat-private', 'online', 'dr_fake', 'm10', 'aikasalig', {
    myth: 'What I tell a health chatbot stays private, like a clinic visit.',
    fact: 'Chats may be stored or used to improve the AI. Keep your full name, ID numbers and diagnoses out.',
    why: 'Chatbots feel personal and patient, so it is easy to open up. Unlike a clinic, the privacy rules for chats are often unclear.',
    check: 'Read the app\'s privacy settings before sharing. Bring personal health questions to your health worker instead.',
    basis: 'NPC Advisory No. 2024-04: Guidelines on AI and the Data Privacy Act (2024); CONTENT_GUIDE AI facts',
  }),

  // DOST-NICER project topics 2026-10-16 (sources in planning/01_references.md, "Library myths: DOST-NICER project topics")
  // Coughs, flu and outbreaks (HealthPH+)
  myth('many-posts-outbreak', 'outbreaks', 'fear_monger', 'm05', 'healthph', {
    myth: 'If many people post about fever online, it is an official outbreak.',
    fact: 'Online posts are early clues. Health workers check them first, and health authorities announce real outbreaks.',
    why: 'When the feed fills with sick neighbours, it feels like proof. Worry for our families makes every post seem urgent.',
    check: 'Look for an announcement from DOH or your city health office. Ask your barangay health worker what they know.',
    basis: 'WHO Epidemic Intelligence from Open Sources (EIOS): online signals are verified by analysts before they count as events',
  }),
  myth('gc-outbreak-rumour', 'outbreaks', 'fear_monger', 'm05', 'healthph', {
    myth: 'An outbreak warning in the group chat is always true.',
    fact: 'Rumours often spread faster than checks. Real outbreak news comes from DOH and local health offices.',
    why: 'Family chats are where we look out for each other. A warning from someone we love feels too important to doubt.',
    check: 'Before forwarding, check DOH or city health office pages. If you cannot confirm it, do not share it yet.',
    basis: 'WHO: WHO public health research agenda for managing infodemics (2021)',
  }),
  myth('flu-just-a-cold', 'outbreaks', 'kwento_kim', 'm03', 'healthph', {
    myth: 'The flu is just a bad cold.',
    fact: 'Flu often starts suddenly with fever and body aches. It can be serious for seniors, young children and pregnant women.',
    why: 'Both start with a cough and a runny nose, and most people get better at home. So it is easy to treat them the same.',
    check: 'Ask your health center about the yearly flu vaccine. Get help fast for trouble breathing or chest pain.',
    basis: 'WHO fact sheet: Influenza (seasonal) (2025)',
  }),
  myth('flu-vaccine-gives-flu', 'outbreaks', 'fear_monger', 'm04', 'healthph', {
    myth: 'The flu vaccine gives you the flu.',
    fact: 'Flu shots cannot cause flu. A sore arm or mild fever may happen and passes quickly.',
    why: 'Some people catch a cold soon after a shot, so the shot gets the blame. Protection also takes about two weeks to build.',
    check: 'Ask your health worker what to expect after a flu shot and when the protection starts.',
    basis: 'CDC: Flu Vaccine Safety Information (2024); WHO fact sheet: Influenza (seasonal) (2025)',
  }),
  myth('cover-cough-not-needed', 'outbreaks', 'kwento_kim', 'm05', 'healthph', {
    myth: 'A small cough is no reason to cover my mouth or wear a mask.',
    fact: 'Even a mild cough can spread germs. Cover it with a tissue or your elbow, and wear a mask around others.',
    why: 'When we feel only a little sick, we do not want to make a fuss. Masks can also feel awkward in a crowd.',
    check: 'Cough into your elbow, wash your hands and stay home when sick if you can. Mask up around seniors and babies.',
    basis: 'WHO fact sheet: Influenza (seasonal) (2025): cover coughs and sneezes, clean hands, stay home when unwell',
  }),
  myth('pneumonia-just-cold', 'outbreaks', 'kwento_kim', 'm03', 'healthph', {
    myth: 'Pneumonia is just a bad cold that goes away on its own.',
    fact: 'Pneumonia is a lung infection that can be serious. Fast or hard breathing needs a health worker right away.',
    why: 'Pneumonia often starts like a cough or cold, so it is easy to wait it out. Many families hope rest at home is enough.',
    check: 'Watch how a sick child or senior breathes. Go to the health center now if breathing is fast or hard.',
    basis: 'WHO fact sheet: Pneumonia in children (2022): danger signs; vaccines and clean air prevent many cases',
  }),
  myth('water-rinse-enough', 'outbreaks', 'kwento_kim', 'm03', 'healthph', {
    myth: 'A quick rinse with water is enough to clean my hands.',
    fact: 'Washing with soap and water for at least 20 seconds removes far more germs and helps stop infections spreading.',
    why: 'Hands that look clean feel clean, and soap is not always nearby. A quick rinse feels like enough on a busy day.',
    check: 'Wash with soap for as long as it takes to hum "Happy Birthday" twice, especially before eating and after coughing.',
    basis: 'CDC: About Handwashing (2024); CONTENT_GUIDE safe facts: soap and water for at least 20 seconds',
  }),

  // HIV (AdvocAid PH): person-first, stigma-free, no blame
  myth('hiv-casual-contact', 'hiv', 'fear_monger', 'm05', 'advocaid', {
    myth: 'You can get HIV from sharing food, hugging or mosquito bites.',
    fact: 'HIV does not spread through hugs, kisses, shared food or utensils, toilets or mosquito bites.',
    why: 'HIV was once surrounded by fear and little information, and some of those old warnings are still repeated. Wanting to stay safe is natural.',
    check: 'Ask a health worker or a DOH HIV treatment hub how HIV does and does not spread.',
    basis: 'WHO fact sheet: HIV and AIDS (2026); CDC: Ways HIV is not transmitted (2024)',
  }),
  myth('hiv-death-sentence', 'hiv', 'fear_monger', 'm03', 'advocaid', {
    myth: 'HIV is a death sentence.',
    fact: 'With treatment, people living with HIV can live long, healthy lives. Treatment is free at DOH treatment hubs.',
    why: 'Many of us remember stories from years ago, before good treatment was easy to get. Those sad memories stay strong.',
    check: 'Ask a DOH treatment hub or social hygiene clinic about free HIV care and support.',
    basis: 'WHO fact sheet: HIV and AIDS (2026): a manageable chronic condition with treatment; RA 11166 (2018): free treatment at hubs',
  }),
  myth('hiv-always-passed-on', 'hiv', 'kwento_kim', 'm03', 'advocaid', {
    myth: 'People living with HIV will always pass it to their partners.',
    fact: 'People with HIV who take treatment and keep an undetectable viral load do not pass HIV on through sex.',
    why: 'This good news is newer than the old fears, and few people talk about it. Most of us learned about HIV when it was scarier.',
    check: 'Ask a health worker at a DOH treatment hub what "undetectable" means and how it is checked.',
    basis: 'WHO policy brief: The role of HIV viral suppression in improving individual health and reducing transmission (2023)',
  }),
  myth('hiv-test-costly-public', 'hiv', 'fear_monger', 'm10', 'advocaid', {
    myth: 'An HIV test costs a lot, and everyone will find out the result.',
    fact: 'HIV testing is free at government treatment hubs and many clinics, and the law keeps results confidential.',
    why: 'Worry about money and about what others will say is real. Fear of gossip keeps many people from getting tested.',
    check: 'Visit or call a social hygiene clinic or DOH treatment hub. Ask how testing works and how your privacy is kept.',
    basis: 'Philippine HIV and AIDS Policy Act (RA 11166, 2018): voluntary, confidential testing; DOH: free testing at government hubs',
  }),
  myth('hiv-only-some-groups', 'hiv', 'kwento_kim', 'm09', 'advocaid', {
    myth: 'Only some kinds of people get HIV.',
    fact: 'HIV can affect anyone. Testing and prevention are for everyone, without judgment.',
    why: 'News stories often focus on a few groups, so HIV can feel like a problem for other people. That makes it easy to skip testing.',
    check: 'If you think you may have been at risk, ask a health worker about a free, confidential test.',
    basis: 'WHO fact sheet: HIV and AIDS (2026); UNAIDS Global AIDS Update (2025)',
  }),
  myth('hiv-no-prevention-medicine', 'hiv', 'kwento_kim', 'm03', 'advocaid', {
    myth: 'There is no medicine that can help prevent HIV.',
    fact: 'PrEP is a medicine that greatly lowers the chance of getting HIV. A health worker can tell if it suits you.',
    why: 'Most of us only heard about condoms and testing, so a prevention medicine sounds too good to be true. New health news travels slowly.',
    check: 'Ask a DOH treatment hub or social hygiene clinic whether PrEP is available near you.',
    basis: 'WHO fact sheet: HIV and AIDS (2026): WHO-recommended pre-exposure prophylaxis (PrEP) options',
  }),
  myth('hiv-tell-by-looks', 'hiv', 'kwento_kim', 'm09', 'advocaid', {
    myth: 'You can tell if someone has HIV just by looking at them.',
    fact: 'Many people with HIV look and feel well for years. Only a test can tell anyone\'s HIV status.',
    why: 'Old pictures in the news showed very sick people, so that image stuck. It is natural to trust what we see.',
    check: 'Do not guess about anyone. If you want to know your own status, ask for a free, confidential test.',
    basis: 'WHO fact sheet: HIV and AIDS (2026): many people do not know their status; testing is the only way to know',
  }),
  myth('hiv-map-shows-cases', 'hiv', 'kwento_kim', 'm02', 'advocaid', {
    myth: 'A map of online HIV talk shows where HIV cases are.',
    fact: 'It shows where people post about HIV, not where cases are. Official case counts come from DOH.',
    why: 'Colourful maps look scientific and exact. It is easy to forget they only count posts, and some places post more than others.',
    check: 'Read the map\'s title and notes to see what was counted. For case numbers, look at DOH HIV reports.',
    basis: 'DOH Epidemiology Bureau: HIV/AIDS and ART Registry of the Philippines (HARP); AdvocAid PH note: discourse maps are not prevalence',
  }),

  // AI in health care (AIKasalig)
  myth('ai-decides-alone', 'healthai', 'dr_fake', 'm06', 'aikasalig', {
    myth: 'AI in a hospital makes decisions on its own.',
    fact: 'Health workers stay responsible. AI gives suggestions that trained people check before they decide.',
    why: 'Movies and news make AI sound like a robot doctor. When a machine seems smart, it is easy to picture it in charge.',
    check: 'Ask your doctor or nurse who checks the AI\'s suggestion and who is responsible for your care.',
    basis: 'WHO: Ethics and governance of artificial intelligence for health (2021): human autonomy, responsibility and accountability',
  }),
  myth('ai-cannot-be-biased', 'healthai', 'dr_fake', 'm09', 'aikasalig', {
    myth: 'AI cannot be biased because it is a machine.',
    fact: 'AI learns from data made by people. If the data leaves groups out, the AI can be unfair to them.',
    why: 'Machines feel neutral because they have no feelings. Numbers and computers can seem fairer than people.',
    check: 'Ask whether the tool was tested on people like you, including older adults, women and people in the provinces.',
    basis: 'WHO: Ethics and governance of artificial intelligence for health (2021): inclusiveness and equity',
  }),
  myth('ai-app-high-ratings', 'healthai', 'kwento_kim', 'm03', 'aikasalig', {
    myth: 'An AI health app with five-star ratings must be accurate.',
    fact: 'Ratings show if people like an app, not if its health advice is right. Ask if it was tested.',
    why: 'Stars and happy reviews are quick to read and feel like advice from friends. Checking studies takes time we do not have.',
    check: 'Look for who made the app and whether it is approved for health use. Ask your health worker before relying on it.',
    basis: 'WHO: Regulatory considerations on artificial intelligence for health (2023): evidence and validation before use',
  }),
  myth('cannot-ask-ai-why', 'healthai', 'dr_fake', 'm02', 'aikasalig', {
    myth: 'You cannot ask how an AI reached its result.',
    fact: 'You can ask. Health workers should explain in plain words what the AI looked at and how they used it.',
    why: 'AI can seem like a black box that even experts do not understand. It may feel rude to question a doctor or a machine.',
    check: 'Ask: "What did the AI look at, and do you agree with it?" A good health worker will explain.',
    basis: 'WHO: Ethics and governance of AI for health (2021): transparency, explainability and intelligibility; RA 10173 right to be informed',
  }),
  myth('chatbot-skip-checkups', 'healthai', 'dr_fake', 'm03', 'aikasalig', {
    myth: 'With a health chatbot, I can skip my regular check-ups.',
    fact: 'A chatbot cannot examine you or run tests. Keep your check-ups and use chatbots only for general information.',
    why: 'Chatbots are free, fast and awake at midnight, while clinics mean travel, lines and costs. Saving time and money matters.',
    check: 'Keep your health center appointments. Bring your chatbot questions to your health worker.',
    basis: 'WHO: Ethics and governance of AI for health: Guidance on large multi-modal models (2024)',
  }),
  myth('health-data-never-shared', 'healthai', 'dr_fake', 'm10', 'aikasalig', {
    myth: 'Health data I give an app is never shared with anyone.',
    fact: 'Some apps share data with other companies. The privacy notice must tell you, and the law gives you rights.',
    why: 'Apps look friendly and official, and privacy notices are long. Most of us tap "agree" to get on with our day.',
    check: 'Read the sharing part of the privacy notice before signing up. You can ask the app what it keeps and to delete it.',
    basis: 'Data Privacy Act of 2012 (RA 10173): rights to be informed, to access and to erasure; NPC Advisory No. 2024-04 (2024)',
  }),
  myth('right-mostly-right-for-me', 'healthai', 'kwento_kim', 'm09', 'aikasalig', {
    myth: 'An AI that is right most of the time will be right for me.',
    fact: 'An AI can do well on average but miss people unlike those in its training data. Ask how it was tested.',
    why: 'A score like "90% accurate" sounds like a promise to each of us. Averages are easy to read as personal guarantees.',
    check: 'Ask whether the AI was tested on people like you. Tell your health worker if a result does not fit how you feel.',
    basis: 'WHO: Regulatory considerations on artificial intelligence for health (2023): test on the intended population',
  }),
  myth('trust-ai-fully', 'healthai', 'dr_fake', 'm06', 'aikasalig', {
    myth: 'Trusting AI means trusting it fully.',
    fact: 'Good trust fits the task: rely on AI where it is proven, and double-check it when the stakes are high.',
    why: 'It feels simpler to trust a tool all the way or not at all. Partial trust sounds confusing, but it is what careful people do.',
    check: 'Before acting on an AI answer, ask: how serious is this, and who can double-check it?',
    basis: 'WHO: Ethics and governance of artificial intelligence for health (2021); ARAW calibrated trust (docs/SPEC.md section 1)',
  }),

  // Dengue and mosquitoes (Mosquito Density and Disease Outbreak Prediction)
  myth('aedes-only-dengue', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'Aedes mosquitoes spread only dengue.',
    fact: 'The same Aedes mosquitoes can also spread chikungunya and Zika. Stopping them protects against all three.',
    why: 'Dengue is the mosquito disease we hear about most. Names like chikungunya and Zika can sound far away.',
    check: 'Ask your barangay health worker which mosquito diseases are in your area and how to stop mosquitoes breeding.',
    basis: 'WHO: Global strategic preparedness, readiness and response plan for dengue and other Aedes-borne arboviruses (2024)',
  }),
  myth('bottle-cap-too-small', 'dengue', 'kwento_kim', 'm03', 'mosquito', {
    myth: 'A bottle cap of water is too small to breed mosquitoes.',
    fact: 'Aedes mosquitoes can breed in very little clean water, like caps, plant trays and old tires.',
    why: 'A tiny bit of water does not look like a danger. We picture mosquitoes coming from big canals and ponds.',
    check: 'Every week, search for small water holders around the house and empty, scrub or cover them. This is DOH\'s first S.',
    basis: 'WHO fact sheet: Dengue and severe dengue (2025); DOH 4S: Search and destroy mosquito breeding places',
  }),
  myth('reporting-breeding-site-useless', 'dengue', 'kwento_kim', 'm05', 'mosquito', {
    myth: 'Reporting a breeding site to the barangay does not help.',
    fact: 'Community reports help barangays and LGUs find and clean up breeding sites before cases rise.',
    why: 'It can feel like reports go nowhere, or that one person cannot make a difference. Many of us also do not want to bother anyone.',
    check: 'Report standing water in shared places to your barangay health worker, with the location and a photo if you can.',
    basis: 'WHO: Global strategic preparedness, readiness and response plan for dengue and other Aedes-borne arboviruses (2024): community protection',
  }),
  myth('mosquitoes-health-workers-job', 'dengue', 'kwento_kim', 'm06', 'mosquito', {
    myth: 'Stopping mosquito diseases is only a job for health workers.',
    fact: 'It takes everyone. People, animals and our surroundings share health, so clean yards and drains protect all.',
    why: 'Health feels like something for clinics and doctors. Cleaning drains and yards does not feel like health work.',
    check: 'Join your barangay clean-up. Keep drains clear, and change water for animals and plants often.',
    basis: 'WHO fact sheet: One Health (2023); Quadripartite One Health Joint Plan of Action (2022)',
  }),
];

export const mythById = (id: string): Myth | undefined => MYTHS.find((m) => m.id === id);
