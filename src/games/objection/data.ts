// OBJECTION! case data: three case templates (incident x organisation x complainant), their true statements, their false
// statements ("lies") and the evidence cards. All people, organisations and apps are fictional. Everything here is plain data, so
// the sim can build any hearing from a seed. Text may use the slots {who}, {org}, {thing} and {bot}.
// Facts are kept general and match the Data Privacy Act (RA 10173): the rights, the data protection officer, the National
// Privacy Commission, breach notice within 72 hours, and that the organisation (not "the AI") is accountable.

export type TemplateId = 'leak' | 'claim' | 'chatbot';
export type EvidenceKind = 'document' | 'screenshot' | 'right';

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  /** What the card shows. */
  shows: string;
}

/** A true statement: pressing it adds detail, objecting to it is a mistake (and `why` says what makes it true). */
export interface Truth {
  text: string;
  press: string;
  why: string;
}

/** A false statement. `proof` is the one evidence card that exposes it; `decoys` are plausible cards that do not. */
export interface Lie {
  id: string;
  text: string;
  /** Pressing it lets a slip out: a hint, never the answer. */
  press: string;
  proof: string;
  decoys: readonly string[];
  /** Why the statement is false, shown when the case is closed. */
  why: string;
  /** "Remember:" line in plain words. */
  lesson: string;
}

export interface Template {
  id: TemplateId;
  /** Case title, e.g. "The leaked lab results". */
  title: string;
  /** What happened, in two sentences. */
  brief: string;
  /** Who stands at the witness stand. */
  witness: string;
  /** What a complainant lost or was denied: shown on the case-closed card. */
  harm: string;
  orgs: readonly string[];
  things: readonly string[];
  truths: readonly Truth[];
  lies: readonly Lie[];
}

/** Synthetic complainants. Honorifics only; sentences about them avoid pronouns. */
export const COMPLAINANTS: readonly string[] = ['Tita Baby', 'Mang Dado', 'Aling Merly', 'Kuya Jomar', 'Lola Pacing', 'Ate Liza'];

/** The chatbot's name, per clinic. */
export const BOTS: readonly string[] = ['Doc Tanong', 'Nurse Kuwento', 'Bot Bayani'];

export const EVIDENCE: Readonly<Record<string, Evidence>> = {
  // ---- the rights and rules (shared by every case) ----
  'r-informed': {
    id: 'r-informed',
    kind: 'right',
    title: 'Right to be informed',
    shows: 'You have the right to know what personal data is collected, why, who gets it and how long it is kept, before it is used.',
  },
  'r-access': {
    id: 'r-access',
    kind: 'right',
    title: 'Right to access',
    shows: 'You can ask to see the personal data an organisation keeps about you, and where it came from.',
  },
  'r-object': {
    id: 'r-object',
    kind: 'right',
    title: 'Right to object',
    shows: 'You can say no to some uses of your data, such as marketing, and to certain automated decisions about you.',
  },
  'r-correct': {
    id: 'r-correct',
    kind: 'right',
    title: 'Right to correct',
    shows: 'If your data is wrong or out of date, you can ask the organisation to fix it.',
  },
  'r-erase': {
    id: 'r-erase',
    kind: 'right',
    title: 'Right to erase or block',
    shows: 'You can ask an organisation to remove or stop using your data when it is no longer needed or was not handled properly.',
  },
  'r-portability': {
    id: 'r-portability',
    kind: 'right',
    title: 'Right to data portability',
    shows: 'You can ask for a copy of your data in a common format, so you can take it to another service.',
  },
  'r-damages': {
    id: 'r-damages',
    kind: 'right',
    title: 'Right to damages',
    shows: 'If misuse of your data causes you harm, you may be paid for it.',
  },
  'r-complain': {
    id: 'r-complain',
    kind: 'right',
    title: 'Right to complain',
    shows: 'You can complain to the organisation’s Data Protection Officer first, then to the National Privacy Commission.',
  },
  'r-human': {
    id: 'r-human',
    kind: 'right',
    title: 'Ask for a human review',
    shows: 'If a computer program made a big decision about you, you can ask for an explanation and for a person to look at it again.',
  },
  'r-accountable': {
    id: 'r-accountable',
    kind: 'right',
    title: 'Who is responsible',
    shows: 'The organisation that chooses to use AI or your data answers for what happens. “The AI did it” is not an excuse.',
  },
  // ---- the leaked records ----
  'leak-log': {
    id: 'leak-log',
    kind: 'screenshot',
    title: 'The sent log',
    shows: 'The {org} app’s own log: on the day in question, {who}’s {thing} was emailed to an address that is not {who}’s.',
  },
  'leak-notice': {
    id: 'leak-notice',
    kind: 'document',
    title: 'The privacy notice',
    shows: 'The notice {who} saw when signing up: “Your {thing} is seen only by you and the doctors you choose.” It does not mention outside companies.',
  },
  'leak-help': {
    id: 'leak-help',
    kind: 'screenshot',
    title: 'The Help page',
    shows: 'The app’s Help page, with an email address for the Data Protection Officer at the bottom.',
  },
  'leak-receipt': {
    id: 'leak-receipt',
    kind: 'document',
    title: 'The sign-up receipt',
    shows: 'A receipt that {who} signed up for the {org} app and saved a {thing} there.',
  },
  'breach-rule': {
    id: 'breach-rule',
    kind: 'document',
    title: 'The breach rule',
    shows: 'The National Privacy Commission’s rule, in plain words: after a serious data breach, the organisation must tell the Commission and the people affected within 72 hours.',
  },
  // ---- the AI-flagged claim ----
  'claim-receipt': {
    id: 'claim-receipt',
    kind: 'document',
    title: 'The claim receipt',
    shows: 'A stamped receipt: {org} received {who}’s {thing}, with all the papers, on the day it was sent.',
  },
  'claim-letter': {
    id: 'claim-letter',
    kind: 'document',
    title: 'The rejection letter',
    shows: 'The letter to {who}: “Your claim was flagged by the system. No further action.” It gives no reason.',
  },
  'claim-log': {
    id: 'claim-log',
    kind: 'screenshot',
    title: 'The system log',
    shows: '{org}’s system log: Flagged, Rejected, Letter sent. Time between flag and rejection: 0 minutes. Staff review: none.',
  },
  'claim-records': {
    id: 'claim-records',
    kind: 'screenshot',
    title: 'The member list',
    shows: 'Two members with similar names. The flag came from the other member’s history, which was linked to {who} by mistake.',
  },
  'claim-policy': {
    id: 'claim-policy',
    kind: 'document',
    title: 'The claims policy',
    shows: '{org}’s claims policy: “A member may appeal a rejected claim in writing.”',
  },
  // ---- the chatbot ----
  'bot-page': {
    id: 'bot-page',
    kind: 'screenshot',
    title: 'The clinic chat page',
    shows: 'The {org} web page: a smiling nurse photo and the label “{bot}”. Nowhere does it say that this is an AI.',
  },
  'bot-chat': {
    id: 'bot-chat',
    kind: 'screenshot',
    title: 'The chat',
    shows: '{who}: “My child has a very high fever and is very sleepy.” {bot}: “It is probably nothing. Rest at home and wait. No need to see a health worker.”',
  },
  'bot-human': {
    id: 'bot-human',
    kind: 'screenshot',
    title: 'Asking for a person',
    shows: '{who} typed “Can I talk to a real person?” three times. {bot} answered each time: “I am here to help! Let us keep chatting.”',
  },
  'bot-store': {
    id: 'bot-store',
    kind: 'document',
    title: 'The clinic’s settings',
    shows: 'The clinic’s own settings page: “Chat history stored: 12 months. Shared with: the chatbot vendor.”',
  },
  'bot-hours': {
    id: 'bot-hours',
    kind: 'document',
    title: 'The clinic hours',
    shows: '{org}’s notice: “Open Monday to Saturday. Walk-ins welcome. Chat assistant available day and night.”',
  },
};

const LEAK: Template = {
  id: 'leak',
  title: 'The leaked {thing}',
  brief: '{who} saved a {thing} in the {org} health app. A stranger got hold of it. At the barangay hall, {who} asks: who is answerable?',
  witness: '{org} app manager',
  harm: '{who}’s private health information reached a stranger.',
  orgs: ['Pulso Plus', 'SariLab', 'Gamot-Gamot'],
  things: ['lab result', 'check-up note', 'vaccine record'],
  truths: [
    {
      text: '{who} saved their {thing} in the {org} app last month.',
      press: 'It is routine. Users keep their health papers in one place, so they can find them when they need them.',
      why: 'The sign-up receipt shows exactly this. It is true and does not clash with any evidence.',
    },
    {
      text: '{org} makes the app and decides how it handles users’ data.',
      press: 'We picked the storage company and we wrote the settings ourselves.',
      why: 'That is true, and it is why {org} is the one that is accountable.',
    },
    {
      text: 'The app has a Data Protection Officer, and the contact is on the Help page.',
      press: 'Open the Help page and scroll down. There is an email address for the DPO.',
      why: 'The Help page screenshot agrees. This statement is true.',
    },
    {
      text: '{who} wrote to our help desk, and we answered two days later.',
      press: 'It was a standard message. It did not explain what happened.',
      why: 'The help desk record agrees. A weak, slow reply is poor service, but the statement itself is true.',
    },
    {
      text: 'Health information counts as sensitive personal information.',
      press: 'Yes, our staff are trained on that. It needs extra care.',
      why: 'True under the Data Privacy Act, and the witness is admitting it. There is nothing to object to.',
    },
    {
      text: 'The app asks for a password and a code sent by text before it opens.',
      press: 'It is the same for every user.',
      why: 'True. Logging in was not what went wrong, so this is not the false statement.',
    },
  ],
  lies: [
    {
      id: 'leak-sent',
      text: 'No one outside has ever seen {who}’s {thing}. Our system is perfectly safe.',
      press: 'Perfectly safe, yes. We checked. Well, we checked the main screen. Not the logs.',
      proof: 'leak-log',
      decoys: ['leak-notice', 'leak-help', 'leak-receipt', 'r-informed', 'r-human'],
      why: 'The sent log shows the {thing} went to a stranger’s address, so “no one outside has seen it” is false.',
      lesson: 'Records and logs show what really happened. Ask to see them.',
    },
    {
      id: 'leak-notice',
      text: 'We told {who}, in our privacy notice, that the {thing} could be shared with outside companies.',
      press: 'It is all in the notice. Everyone agrees when they tap Accept. Probably.',
      proof: 'leak-notice',
      decoys: ['leak-log', 'leak-help', 'leak-receipt', 'r-informed', 'r-erase'],
      why: 'The notice only promised that the doctors {who} chose would see it. It says nothing about outside companies.',
      lesson: 'You have the right to be informed: before your data is used, you should be told who gets it and why.',
    },
    {
      id: 'leak-erase',
      text: '{who} has no right to ask us to delete anything. Once it is in the app, it belongs to us.',
      press: 'It is in the terms and conditions. Nobody reads them, but it is there.',
      proof: 'r-erase',
      decoys: ['leak-notice', 'leak-log', 'r-portability', 'r-informed', 'r-damages'],
      why: 'People can ask an organisation to erase or block their data when it is not needed or was not handled properly. It does not “belong” to the app.',
      lesson: 'Your data stays yours. You can ask to have it erased or blocked.',
    },
    {
      id: 'leak-quiet',
      text: 'We do not have to tell anybody about a leak. We fixed the problem quietly.',
      press: 'Why worry people? Nothing bad came of it. We think.',
      proof: 'breach-rule',
      decoys: ['leak-help', 'leak-receipt', 'leak-log', 'r-complain', 'r-damages'],
      why: 'After a serious breach, an organisation must tell the National Privacy Commission and the people affected within 72 hours.',
      lesson: 'A leak must be reported. If you are never told, you can still complain.',
    },
  ],
};

const CLAIM: Template = {
  id: 'claim',
  title: 'The flagged {thing}',
  brief: '{org}’s AI tool flagged {who}’s {thing} and the claim was rejected. No one explained why. {who} brings it to the barangay hall.',
  witness: '{org} claims officer',
  harm: '{who} was refused money for care, and nobody could say why.',
  orgs: ['Bayanihan Shield', 'Lingap Care Card', 'Tibay Mutual'],
  things: ['check-up claim', 'lab test claim', 'dental claim'],
  truths: [
    {
      text: '{who} sent a {thing} with all the papers last month.',
      press: 'Complete papers, yes. The clerk stamped them received.',
      why: 'The claim receipt agrees. The statement is true.',
    },
    {
      text: 'Our AI tool checks every claim first and gives it a risk score.',
      press: 'Over 70 and the claim gets flagged.',
      why: 'True, and the witness is admitting it: a computer made the first call.',
    },
    {
      text: 'The tool flagged {who}’s claim, and a rejection letter followed.',
      press: 'The letter went out the same day.',
      why: 'The rejection letter confirms this. The statement is true.',
    },
    {
      text: '{org} pays claims from a shared fund that every member pays into.',
      press: 'That is why we are careful with money. Careful, we hope, and not unfair.',
      why: 'True, and harmless. Careful money handling is not the false statement.',
    },
    {
      text: 'A member can appeal a rejected claim in writing.',
      press: 'To the claims desk. That is what {who} is doing today.',
      why: 'The claims policy says so. True: appealing is allowed.',
    },
    {
      text: 'The AI tool was bought from a software company.',
      press: 'But {org} chose to use it, and {org} answers for it.',
      why: 'True. Buying a tool does not move the responsibility away from {org}.',
    },
  ],
  lies: [
    {
      id: 'claim-reason',
      text: 'Our letter told {who} exactly why the claim was rejected.',
      press: 'It said “flagged by the system”. That is a reason. Isn’t it?',
      proof: 'claim-letter',
      decoys: ['claim-receipt', 'claim-policy', 'claim-records', 'r-human', 'r-damages'],
      why: 'The letter only says “flagged by the system”. It gives no reason for the decision.',
      lesson: 'You can ask “why?” and an organisation should be able to explain a decision about you.',
    },
    {
      id: 'claim-person',
      text: 'A staff member always reviews a flagged claim before it is rejected.',
      press: 'Always! Well, mostly. The system sends the letter by itself when the score is high.',
      proof: 'claim-log',
      decoys: ['claim-letter', 'claim-receipt', 'claim-records', 'r-human', 'r-access'],
      why: 'The log shows the claim was rejected 0 minutes after the flag, with no staff review at all.',
      lesson: 'You can ask for a human review, and for a person to look at a computer’s decision again.',
    },
    {
      id: 'claim-correct',
      text: 'If our records are wrong, members cannot ask us to change them.',
      press: 'Records are records. Members just have to live with them.',
      proof: 'r-correct',
      decoys: ['claim-policy', 'claim-log', 'r-access', 'r-portability', 'claim-letter'],
      why: 'People have the right to correct personal data that is wrong or out of date.',
      lesson: 'If a record about you is wrong, you can ask the organisation to correct it.',
    },
    {
      id: 'claim-mixup',
      text: 'The tool read the right records. There was no mix-up with another member.',
      press: 'No mix-up! Unless two members have similar names. Which they do.',
      proof: 'claim-records',
      decoys: ['claim-receipt', 'claim-letter', 'claim-log', 'r-access', 'r-correct'],
      why: 'The member list shows that another member’s history was linked to {who} by mistake.',
      lesson: 'AI makes mistakes, often because the data behind it is wrong. Check the data and ask for a correction.',
    },
    {
      id: 'claim-access',
      text: 'Members are not allowed to see the information we keep about them.',
      press: 'It is internal. Very confidential. From the member. About themselves.',
      proof: 'r-access',
      decoys: ['claim-policy', 'r-correct', 'claim-records', 'r-informed', 'claim-letter'],
      why: 'People have the right to access the personal data an organisation keeps about them.',
      lesson: 'You can ask to see the data an organisation holds about you.',
    },
  ],
};

const CHATBOT: Template = {
  id: 'chatbot',
  title: 'The clinic chatbot',
  brief: '{org} put a chatbot on its website. {who} asked {bot} about a very sick child and was told there was no need to see a health worker. The child got worse.',
  witness: '{org} clinic manager',
  harm: 'Harmful advice from a chatbot delayed care for a sick child.',
  orgs: ['Sampaguita Family Clinic', 'Mabini Care Clinic', 'Dalisay Wellness Clinic'],
  things: ['chat'],
  truths: [
    {
      text: '{org} put {bot} on its website to answer patients’ questions.',
      press: 'Day and night, in Filipino and English. Patients like it.',
      why: 'The clinic’s own notice says so. True, and it shows the clinic chose to use the chatbot.',
    },
    {
      text: '{who} asked {bot} about a child with a very high fever.',
      press: 'Late at night, when the clinic was closed.',
      why: 'The chat screenshot shows this question. It is true.',
    },
    {
      text: '{org} is a real clinic with real doctors and nurses.',
      press: 'Open Monday to Saturday. Walk-ins welcome.',
      why: 'True. A real clinic is exactly why someone can be held accountable.',
    },
    {
      text: '{who} took the child to the hospital the next morning, after the child got worse.',
      press: 'Thankfully, the child is now recovering.',
      why: 'True. It is why this hearing is happening: the advice cost precious time.',
    },
    {
      text: 'The clinic has a Data Protection Officer.',
      press: 'The contact is on our privacy page.',
      why: 'True. And it is where {who} can complain first.',
    },
    {
      text: 'The chatbot answers in seconds.',
      press: 'Faster than our phone line. That was the idea.',
      why: 'True. Fast is not the same as right, but the statement is not false.',
    },
  ],
  lies: [
    {
      id: 'bot-blame',
      text: '{bot} is just a computer program. If it gave bad advice, nobody at the clinic is responsible.',
      press: 'A program cannot be blamed. And neither can we, by that logic. That is the point.',
      proof: 'r-accountable',
      decoys: ['bot-page', 'bot-chat', 'bot-hours', 'r-human', 'r-complain'],
      why: 'The clinic chose to use the chatbot, so the clinic answers for what it says. “The AI did it” is not an excuse.',
      lesson: 'When AI causes harm, the organisation that chose to use it is responsible.',
    },
    {
      id: 'bot-advice',
      text: '{bot} told {who} clearly to see a health worker.',
      press: 'It says so at the bottom of every chat. In small letters. Sometimes.',
      proof: 'bot-chat',
      decoys: ['bot-page', 'bot-hours', 'bot-human', 'r-informed', 'r-human'],
      why: 'The chat shows the chatbot said the opposite: “No need to see a health worker.”',
      lesson: 'A chatbot cannot examine anyone. For a very sick child, see a health worker.',
    },
    {
      id: 'bot-ai',
      text: 'Patients are clearly told that {bot} is an AI and not a real nurse.',
      press: 'It has a nurse’s picture and a friendly name. Is that not clear enough?',
      proof: 'bot-page',
      decoys: ['bot-chat', 'bot-hours', 'bot-store', 'r-human', 'r-damages'],
      why: 'The chat page shows a nurse photo and never says that this is an AI.',
      lesson: 'You should be told when you are talking to an AI.',
    },
    {
      id: 'bot-person',
      text: 'A real person was always one tap away if a patient asked.',
      press: 'Just ask nicely. The bot understands “person”. Usually.',
      proof: 'bot-human',
      decoys: ['bot-chat', 'bot-hours', 'bot-page', 'r-human', 'r-complain'],
      why: 'The screenshot shows {who} asked for a real person three times and the bot kept chatting.',
      lesson: 'Always ask for a human, and keep a record if you are refused.',
    },
    {
      id: 'bot-store',
      text: '{bot} never stores anything patients type.',
      press: 'We delete it right away. Or soon. Or at some point.',
      proof: 'bot-store',
      decoys: ['bot-chat', 'bot-page', 'bot-hours', 'r-access', 'r-erase'],
      why: 'The clinic’s own settings keep chat history for 12 months and share it with the chatbot vendor.',
      lesson: 'You have the right to know what happens to the data you type, and to ask for it to be erased.',
    },
  ],
};

export const TEMPLATES: Readonly<Record<TemplateId, Template>> = { leak: LEAK, claim: CLAIM, chatbot: CHATBOT };
export const TEMPLATE_IDS: readonly TemplateId[] = ['leak', 'claim', 'chatbot'];

/** The statements a hearing starts with, by case number (1-based): early cases are shorter and have fewer evidence cards. */
export const statementCount = (caseNo: number): number => (caseNo <= 2 ? 4 : 5);
export const evidenceCount = (caseNo: number): number => (caseNo <= 1 ? 4 : caseNo <= 3 ? 5 : 6);
