// Library: Myths (Kwentong Kalusugan), docs/SPEC.md section 8 and docs/CONTENT_GUIDE.md sections 3 and 6.
// Facts come only from the guide's safe facts list. No dosing, no diagnosis: every card points to people who can help.
// "Why people believe it" is always kind: people share myths out of care. Mock the trick (the villain), never the person.
import type { ModuleTag } from '../factOrFake/schema';
import type { VillainId } from '../tactics';

export const MYTH_TOPICS = ['dengue', 'medicines', 'vaccines', 'chronic', 'everyday', 'online'] as const;
export type MythTopic = (typeof MYTH_TOPICS)[number];

/** Filter chip labels for the Library. */
export const MYTH_TOPIC_LABELS: Record<MythTopic, string> = {
  dengue: 'Dengue',
  medicines: 'Medicines',
  vaccines: 'Vaccines',
  chronic: 'BP, sugar and cancer',
  everyday: 'Everyday health',
  online: 'AI and online',
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
  review_status: 'unreviewed';
}

const myth = (
  id: string,
  topic: MythTopic,
  villain: VillainId,
  module: ModuleTag,
  text: { myth: string; fact: string; why: string; check: string; basis: string },
): Myth => ({ id, topic, ...text, villain, module, review_status: 'unreviewed' });

export const MYTHS: readonly Myth[] = [
  // Dengue and mosquitoes
  myth('tawa-tawa-dengue', 'dengue', 'miracle_mike', 'm04', {
    myth: 'Tawa-tawa cures dengue.',
    fact: 'No herb is proven to cure dengue. If you have a high fever, see a health worker early.',
    why: 'Tawa-tawa is a remedy passed down with love, and many families tried it while someone got better. When a child is sick, we want to do something.',
    check: 'Ask your health worker. Watch for dengue warning signs and go to the hospital if they appear.',
    basis: 'WHO dengue fact sheet; CONTENT_GUIDE safe facts: no herbal cure for dengue',
  }),
  myth('papaya-leaf-dengue', 'dengue', 'kwento_kim', 'm03', {
    myth: 'Papaya leaf juice is the real cure for dengue.',
    fact: 'Papaya leaf is not a proven dengue cure. Care means fluids and close watch by health workers.',
    why: 'Stories of a neighbour who drank it and recovered spread fast. Most people with dengue do recover, so the juice gets the credit.',
    check: 'Do not let a remedy delay a check-up. Go to the health center early and ask about warning signs.',
    basis: 'WHO dengue fact sheet; CONTENT_GUIDE safe facts: no herbal cure for dengue',
  }),
  myth('dengue-night-bites', 'dengue', 'kwento_kim', 'm06', {
    myth: 'Dengue mosquitoes only bite at night.',
    fact: 'Aedes mosquitoes, which spread dengue, bite mostly in the daytime.',
    why: 'We sleep under a kulambo at night and hear mosquitoes buzz in the dark, so night feels like the danger time.',
    check: 'Check DOH dengue pages or ask your barangay health worker about daytime protection.',
    basis: 'WHO dengue fact sheet (Aedes day-biting); DOH 4S',
  }),
  myth('dengue-dirty-water', 'dengue', 'kwento_kim', 'm03', {
    myth: 'Dengue mosquitoes breed only in dirty water.',
    fact: 'They breed in clean standing water. Cover, clean and empty containers every week.',
    why: 'Dirty canals look like the obvious problem. A clean flower pot or a drum of rain water does not look dangerous at all.',
    check: 'Search your home for standing water this week. Ask your health worker about DOH\'s 4S.',
    basis: 'WHO dengue fact sheet; DOH 4S (search and destroy breeding places)',
  }),
  myth('fogging-is-enough', 'dengue', 'kwento_kim', 'm05', {
    myth: 'Fogging is all we need to stop dengue.',
    fact: 'Fogging is only for outbreaks. Emptying standing water every week matters most.',
    why: 'Fogging is loud and visible, so it feels like strong action. Cleaning containers is quiet work that nobody sees.',
    check: 'Ask your barangay health worker about the 4S: search, secure, seek early, say yes to fogging only in outbreaks.',
    basis: 'DOH 4S strategy',
  }),

  // Medicines
  myth('antibiotics-colds', 'medicines', 'kwento_kim', 'm03', {
    myth: 'Antibiotics cure colds and flu.',
    fact: 'Colds and flu come from viruses. Antibiotics only work on bacteria. Ask a health worker first.',
    why: 'Someone once felt better after antibiotics, so it seemed to work. Colds often get better on their own around that time anyway.',
    check: 'Ask a doctor or health worker before taking any antibiotic. Use them only when prescribed.',
    basis: 'WHO antimicrobial resistance fact sheet',
  }),
  myth('stop-antibiotics-early', 'medicines', 'kwento_kim', 'm03', {
    myth: 'Stop antibiotics once you feel better and save the rest.',
    fact: 'Use antibiotics exactly as a health worker says. Misuse helps germs become resistant.',
    why: 'Feeling better feels like being done, and saving medicine for next time seems thrifty and smart.',
    check: 'Ask your doctor or pharmacist how long to take it before you start.',
    basis: 'WHO antimicrobial resistance fact sheet',
  }),
  myth('tea-replaces-meds', 'medicines', 'miracle_mike', 'm04', {
    myth: 'A herbal tea can replace your maintenance meds.',
    fact: 'Do not stop or change maintenance medicines without talking to your doctor.',
    why: 'Taking pills every day is tiring and costly. A natural tea that promises freedom from pills sounds like a gift.',
    check: 'Bring the tea and your questions to your doctor or barangay health center before changing anything.',
    basis: 'CONTENT_GUIDE safe facts: do not stop maintenance medicines without your doctor',
  }),
  myth('natural-is-safe', 'medicines', 'miracle_mike', 'm04', {
    myth: 'If it is natural, it is always safe.',
    fact: 'Natural does not mean safe. Some herbs can harm you or clash with medicines.',
    why: 'Plants from the garden feel gentle and familiar, and our elders used them. Factory pills feel strong and strange.',
    check: 'Tell your health worker about every herb or supplement you take, together with your medicines.',
    basis: 'WHO traditional medicine guidance; CONTENT_GUIDE safe facts',
  }),
  myth('supplement-is-medicine', 'medicines', 'miracle_mike', 'm04', {
    myth: 'A food supplement can cure your illness.',
    fact: 'Supplements are not medicine. In the Philippines their labels must say "No approved therapeutic claims".',
    why: 'Supplement ads look like medicine ads, with doctors, charts and happy families. It is hard to tell them apart.',
    check: 'Read the label for "No approved therapeutic claims" and check the FDA Philippines verification portal.',
    basis: 'FDA Philippines rules on food supplement labelling',
  }),
  myth('fda-number-means-cure', 'medicines', 'dr_fake', 'm04', {
    myth: 'An FDA number means it cures whatever the ad says.',
    fact: 'Registration is not proof of every claim. Health claims on supplements are a red flag.',
    why: 'An official-looking number feels like a stamp of approval for the whole ad, not just the product.',
    check: 'Look up the product on the FDA Philippines portal and compare what it is registered as.',
    basis: 'FDA Philippines verification portal; food supplement labelling rules',
  }),

  // Vaccines (blame-free)
  myth('vaccines-not-checked', 'vaccines', 'conspiracy_kuya', 'm05', {
    myth: 'Vaccines are never checked after they come out.',
    fact: 'Vaccines are tested in large studies and monitored after approval. Side effects are reported and reviewed.',
    why: 'We rarely see the safety work, so it is easy to think nobody is watching. Worry about our children is natural.',
    check: 'Ask your health worker how side effects are reported. Look at DOH vaccine pages.',
    basis: 'WHO vaccine safety monitoring; CONTENT_GUIDE vaccine framing',
  }),
  myth('vaccine-fever-danger', 'vaccines', 'fear_monger', 'm04', {
    myth: 'A fever after a vaccine means it is dangerous.',
    fact: 'Most side effects are mild and short, like a sore arm or mild fever. Serious ones are rare.',
    why: 'Seeing your child feverish is scary, and scary stories get shared more than calm ones.',
    check: 'Ask the health center what reactions are normal and which signs mean you should come back.',
    basis: 'WHO vaccine safety Q&A; CONTENT_GUIDE vaccine framing',
  }),
  myth('vaccines-only-if-you-pay', 'vaccines', 'conspiracy_kuya', 'm05', {
    myth: 'Good vaccines are only for people who can pay.',
    fact: 'Routine childhood vaccines are available free at health centers.',
    why: 'Many things that matter cost money, so free can feel like second-best. Not everyone hears about free programs.',
    check: 'Visit or call your barangay health center and ask for the childhood vaccine schedule.',
    basis: 'DOH national immunization program',
  }),
  myth('share-vaccine-warnings', 'vaccines', 'fear_monger', 'm05', {
    myth: 'Sharing every vaccine warning keeps my family safe.',
    fact: 'Fear spreads faster than facts. Checking with a health worker first is a caring habit.',
    why: 'Forwarding a warning feels like protecting the people we love. Nobody wants to be the one who stayed quiet.',
    check: 'Pause before sharing. Ask a health worker or check an independent fact-checker first.',
    basis: 'CONTENT_GUIDE vaccine framing: fear spreads faster than facts',
  }),

  // Blood pressure, diabetes, cancer
  myth('high-bp-you-feel-it', 'chronic', 'kwento_kim', 'm03', {
    myth: 'You will feel it if your blood pressure is high.',
    fact: 'High blood pressure often has no symptoms. Regular checks at the health center help.',
    why: 'Some people do get headaches, so it makes sense to wait for a sign. Feeling fine feels like being fine.',
    check: 'Get your blood pressure checked at the barangay health center, even when you feel well.',
    basis: 'WHO hypertension fact sheet',
  }),
  myth('ampalaya-cures-diabetes', 'chronic', 'kwento_kim', 'm03', {
    myth: 'Ampalaya tea cures diabetes.',
    fact: 'Ampalaya is a healthy vegetable, but there is no proven herbal cure for diabetes.',
    why: 'Ampalaya is bitter and good for us, and many lolos and lolas swear by it. It feels like strong medicine.',
    check: 'Keep your prescribed medicine and ask your doctor before adding any herbal product.',
    basis: 'CONTENT_GUIDE safe facts: no proven herbal cure for diabetes',
  }),
  myth('herbal-cancer-cure', 'chronic', 'conspiracy_kuya', 'm04', {
    myth: 'A secret herbal mix cures cancer, but doctors hide it.',
    fact: 'There is no proven herbal cure for cancer. Early check-ups and screening help.',
    why: 'Cancer is frightening and treatment is hard. A gentle secret cure gives hope when we need it most.',
    check: 'Ask where the evidence is. Bring the claim to a doctor and check an independent fact-checker.',
    basis: 'WHO cancer fact sheet; CONTENT_GUIDE safe facts',
  }),
  myth('cured-means-stop', 'chronic', 'kwento_kim', 'm02', {
    myth: 'Once my BP is normal, I can stop my maintenance meds.',
    fact: 'A normal reading often means the medicine is working. Ask your doctor before any change.',
    why: 'A good reading feels like being cured. It is natural to hope the pills are no longer needed.',
    check: 'Bring your readings to your doctor and ask what they mean for your medicine.',
    basis: 'CONTENT_GUIDE safe facts: do not stop maintenance medicines without your doctor',
  }),

  // Everyday health
  myth('pasma-washing-hands', 'everyday', 'kwento_kim', 'm05', {
    myth: 'Washing hands after hard work causes pasma.',
    fact: 'Washing with soap and water helps prevent infections. If hand pain or shaking continues, see a health worker.',
    why: 'Pasma is a belief our elders passed down to protect us. Tired, aching hands after work are real, and the warning comes from care.',
    check: 'Keep washing with soap and water. Ask your health worker about hand pain that does not go away.',
    basis: 'WHO hand hygiene guidance; respectful handling of pasma per CONTENT_GUIDE',
  }),
  myth('long-cough-normal', 'everyday', 'kwento_kim', 'm03', {
    myth: 'A cough that lasts for weeks is just a normal cough.',
    fact: 'A cough of 2 weeks or more should be checked for TB. TB is curable, with free treatment.',
    why: 'Coughs are common, and nobody wants to bother the health center for "just a cough".',
    check: 'Go to the barangay health center and ask for a TB check if a cough lasts 2 weeks.',
    basis: 'WHO tuberculosis fact sheet; DOH TB program',
  }),
  myth('animal-bite-home-remedy', 'everyday', 'kwento_kim', 'm03', {
    myth: 'A home remedy is enough for a small dog bite.',
    fact: 'Wash the wound with soap and running water, then go to an animal bite center right away.',
    why: 'Small bites look harmless, and traditional healers are close and trusted. The pet may be family too.',
    check: 'Go to the nearest animal bite center the same day. Rabies is preventable but deadly once symptoms start.',
    basis: 'WHO rabies fact sheet; DOH animal bite centers',
  }),
  myth('flood-water-harmless', 'everyday', 'kwento_kim', 'm06', {
    myth: 'Flood water is harmless if you feel fine after.',
    fact: 'Wading in flood water raises leptospirosis risk. See a health worker after exposure.',
    why: 'During floods we wade because we must. Feeling fine the next day makes it seem like nothing happened.',
    check: 'Tell your health worker you waded in flood water, even if you feel fine.',
    basis: 'WHO leptospirosis guidance; DOH flood advisories',
  }),
  myth('diarrhea-no-fluids', 'everyday', 'kwento_kim', 'm03', {
    myth: 'Drink less during diarrhea so it stops sooner.',
    fact: 'ORS helps prevent dehydration from diarrhea. See a health worker for danger signs.',
    why: 'Less going in seems like less coming out. It is a logical guess when you are tired and worried.',
    check: 'Ask your health center about ORS and the danger signs of dehydration in children.',
    basis: 'WHO diarrhoeal disease fact sheet (ORS)',
  }),
  myth('clear-water-safe', 'everyday', 'kwento_kim', 'm01', {
    myth: 'If water looks clear, it is safe to drink.',
    fact: 'Clear water can still carry germs. Bringing it to a rolling boil makes it safer.',
    why: 'We judge with our eyes, and clean-looking water from a familiar source feels safe.',
    check: 'Ask your barangay health worker if your water source is safe, or boil it when unsure.',
    basis: 'WHO drinking-water guidance',
  }),
  myth('vape-just-water', 'everyday', 'miracle_mike', 'm08', {
    myth: 'Vaping is harmless because it is just water vapour.',
    fact: 'Smoking and vaping both harm the lungs and heart.',
    why: 'Vapes smell sweet and look like a clean mist, and they are often sold as the safer choice.',
    check: 'Ask your health worker about vaping, or look at DOH pages on tobacco and vapes.',
    basis: 'WHO tobacco and e-cigarette fact sheets',
  }),
  myth('teens-need-less-sleep', 'everyday', 'kwento_kim', 'm08', {
    myth: 'Teens are young and strong, so they need less sleep.',
    fact: 'Teens need more sleep than adults. Sleep supports mood, memory and the immune system.',
    why: 'Teens seem full of energy late at night, and adults remember pulling all-nighters too.',
    check: 'Ask a health worker or school nurse how much sleep a teen needs.',
    basis: 'WHO adolescent health guidance; sleep and wellbeing consensus',
  }),

  // AI and online
  myth('forwarded-many-times', 'online', 'fear_monger', 'm05', {
    myth: 'If a message was forwarded many times, it must be true.',
    fact: 'Many shares do not make a claim true. Check the source before you forward.',
    why: 'When many people we trust share something, it feels checked already. Sharing is how we care for each other.',
    check: 'Find who first said it. Look for a second trusted source, like DOH or a fact-checker.',
    basis: 'Media literacy consensus; independent fact-checking practice',
  }),
  myth('chatbot-always-right', 'online', 'dr_fake', 'm03', {
    myth: 'A chatbot always tells the truth.',
    fact: 'Chatbots can sound sure and still be wrong. Check health answers with a health worker.',
    why: 'Chatbots answer fast, in neat sentences, with a confident tone. That sounds like an expert.',
    check: 'Ask the same question to a health worker, or check a DOH or WHO page.',
    basis: 'CONTENT_GUIDE AI facts: AI can be confidently wrong (hallucination)',
  }),
  myth('chatbot-can-diagnose', 'online', 'dr_fake', 'm03', {
    myth: 'A health chatbot can diagnose me like a doctor.',
    fact: 'Chatbots cannot examine you and are not doctors. They can help you prepare questions.',
    why: 'Clinics can be far and busy, and the chatbot is always awake. It feels like a doctor in your pocket.',
    check: 'Use the chatbot to write your questions, then bring them to a health worker. Skip your full name and ID numbers.',
    basis: 'CONTENT_GUIDE AI facts: chatbots are not doctors',
  }),
  myth('doctor-in-ad-proves-it', 'online', 'dr_fake', 'm07', {
    myth: 'If a doctor is in the video ad, the product works.',
    fact: 'Doctor videos can be faked with AI. A real doctor selling a miracle product is a red flag.',
    why: 'We were taught to respect doctors. A familiar white coat and a calm voice feel trustworthy.',
    check: 'Look for the doctor\'s own official page and the product\'s FDA registration.',
    basis: 'CONTENT_GUIDE AI facts: deepfaked doctor endorsements',
  }),
  myth('spot-fakes-by-glitches', 'online', 'dr_fake', 'm07', {
    myth: 'You can always spot a fake video by its glitches.',
    fact: 'AI fakes can look and sound real. Checking the source works better than hunting glitches.',
    why: 'Early fakes had odd blinking and blurry mouths, and tips for spotting them went viral.',
    check: 'Ask who posted it first, and look for the same news on an official page.',
    basis: 'CONTENT_GUIDE AI facts: spotting glitches is unreliable',
  }),
  myth('deleted-means-true', 'online', 'conspiracy_kuya', 'm05', {
    myth: 'If "they" deleted the post, it must be true.',
    fact: 'Posts are removed for many reasons, including false health claims. Removal is not proof.',
    why: 'Being told something is hidden makes it feel precious. Nobody likes the feeling of being kept in the dark.',
    check: 'Search an independent fact-checker for the claim before you repost it.',
    basis: 'Platform policies on health misinformation; fact-checking practice',
  }),
  myth('ai-powered-is-better', 'online', 'miracle_mike', 'm01', {
    myth: 'An "AI-powered" health product must be smarter and safer.',
    fact: '"AI-powered" is often just a sales label. Ask what it does and whether it is proven.',
    why: 'AI is in the news every day, so the word sounds modern and impressive.',
    check: 'Ask the seller what the AI actually does, and check the product with the FDA portal.',
    basis: 'Module 1 lesson on AI hype; FDA Philippines verification portal',
  }),
  myth('phone-is-listening', 'online', 'conspiracy_kuya', 'm01', {
    myth: 'My phone shows tea ads because it secretly listens to me.',
    fact: 'Apps learn patterns from what you tap, watch and search, then guess what to show you.',
    why: 'The ads can feel spookily on point, right after we talked about something. Of course it feels like listening.',
    check: 'Open the app\'s ad settings to see why an ad was shown, and review app permissions.',
    basis: 'Module 1 lesson: AI learns patterns from examples to make guesses',
  }),
];

export const mythById = (id: string): Myth | undefined => MYTHS.find((m) => m.id === id);
