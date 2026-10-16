// Module 7 · Made by AI? (docs/SPEC.md section 4): hook, seven lesson cards, the Gawa Ko 'To! game and the takeaway.
// Cards follow SPEC's list: what generative AI is, label it, ask consent, credit artists, fake doctor ads, honest or not, a poll.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm07',
  review_status: 'unreviewed',
  hook: {
    id: 'm07-c1',
    type: 'story-hook',
    scene: 'Bea’s room, the night before the barangay health drive',
    speaker: 'Bea',
    line: 'I have to make the poster for the health drive, Ara! This AI tool makes pictures in seconds. Is it okay to just use them?',
    icon: 'brush',
    ara: {
      intro: 'Bea needs a poster by morning. AI can help her make it fast. Let us find out how to make it honestly.',
      done: 'Here we go! Fast is fine. Honest is better.',
    },
  },
  cards: [
    {
      id: 'm07-c2',
      type: 'info',
      title: 'Generative AI makes new things',
      body: 'Generative AI makes new pictures, words and voices. It learned the patterns from a huge number of examples made by people, then puts together something new that looks or sounds real. It does not understand what it makes, and it can sound sure and still be wrong. That is why a person must check it.',
      icon: 'ai-scan',
      ara: { intro: 'New pictures in seconds. But it only copies patterns.' },
    },
    {
      id: 'm07-c3',
      type: 'choice',
      question: 'Bea made the poster picture with AI. Should the poster say "Made with AI"?',
      options: [
        {
          text: 'No. If it looks good, nobody needs to know.',
          feedback: 'People can feel tricked when they find out later. A hidden AI picture can make them doubt the whole poster, even the true health facts.',
        },
        {
          text: 'Yes. A small label is honest and builds trust.',
          feedback: 'Yes! A label takes a second, and it tells people what they are looking at. Labelled AI content is easier to trust.',
        },
        {
          text: 'Only if someone asks.',
          feedback: 'Most people will never ask. The label should be there from the start, so everyone can see it.',
        },
      ],
      correct: 1,
      ara: { done: 'Label what AI made. Honest and simple.' },
    },
    {
      id: 'm07-c4',
      type: 'choice',
      question: 'Bea likes a photo of her neighbour Mang Rey at the health center. Can she use it on the poster without asking?',
      options: [
        {
          text: 'Yes. The poster is for a good cause.',
          feedback: 'A good cause does not replace permission. It is his face, and he gets to decide where it goes.',
        },
        {
          text: 'No. Ask him first, and respect the answer.',
          feedback: 'Yes! Consent comes before using someone’s face or voice, even for a good cause. If he says no, pick another picture.',
        },
        {
          text: 'Yes, because the photo was taken in public.',
          feedback: 'Being photographed in a public place is not the same as agreeing to be on a poster. Always ask.',
        },
      ],
      correct: 1,
      ara: { done: 'Face or voice? Ask first. Always.' },
    },
    {
      id: 'm07-c5',
      type: 'reveal',
      title: 'Where AI art comes from',
      prompt: 'Tap each tile to see who is behind the picture.',
      tiles: [
        {
          label: 'It learned from artists',
          detail: 'AI picture tools learned from enormous numbers of pictures, many made by real artists. Some of them never agreed to this, and they are still talking about what is fair.',
        },
        {
          label: 'Credit people',
          detail: 'When you use an artist’s drawing, put their name on it. A credit line costs nothing, and it shows the work belongs to someone.',
        },
        {
          label: 'Ask first',
          detail: 'Using someone’s drawing with their permission is respect. Using it without asking, or copying their style to pass it off as yours, is not.',
        },
      ],
      ara: { done: 'Behind every picture there are people. Credit them.' },
    },
    {
      id: 'm07-c6',
      type: 'reveal',
      title: 'Why fake doctor ads harm',
      prompt: 'Tap each tile to see how a fake doctor ad hurts people.',
      tiles: [
        {
          label: 'People trust the face',
          detail: 'A doctor’s face and voice carry trust. An AI copy of a real doctor borrows that trust without asking, and it can fool even careful people.',
        },
        {
          label: 'They buy unproven products',
          detail: 'These ads often sell "miracle" products that nobody has tested. People spend money they cannot spare on something that does not work.',
        },
        {
          label: 'They may skip real care',
          detail: 'Someone who believes a fake ad may stop seeing a health worker or stop using the care they need. That is how the harm gets serious.',
        },
        {
          label: 'What to do',
          detail: 'Be wary of "doctor" ads that promise a cure. Check the real clinic or the official health page, and report the ad. If it is not from a trusted source, do not buy.',
        },
      ],
      ara: { done: 'A trusted face can be copied. Check before you believe or buy.' },
    },
    {
      id: 'm07-c7',
      type: 'swipe-sort',
      title: 'Honest poster, or not okay?',
      bins: [
        { id: 'ok', label: 'Honest' },
        { id: 'no', label: 'Not okay' },
      ],
      items: [
        {
          id: 'm07-s1',
          text: 'Copy the health facts from the DOH page, with the source named',
          bin: 'ok',
          why: 'Honest: health facts should come from a trusted source, and naming it helps people check.',
        },
        {
          id: 'm07-s2',
          text: 'Let the AI make up the health facts for the poster',
          bin: 'no',
          why: 'Not okay: AI can invent facts that sound right. Health facts must come from a trusted source.',
        },
        {
          id: 'm07-s3',
          text: 'Use an AI picture and add "Made with AI"',
          bin: 'ok',
          why: 'Honest: the picture is AI-made and it says so.',
        },
        {
          id: 'm07-s4',
          text: 'Use an AI picture of a real doctor to endorse the poster',
          bin: 'no',
          why: 'Not okay: the doctor never agreed, and people may trust a face that never said it.',
        },
        {
          id: 'm07-s5',
          text: 'Use a neighbour’s photo after they said yes',
          bin: 'ok',
          why: 'Honest: they were asked, and they agreed.',
        },
        {
          id: 'm07-s6',
          text: 'Use an artist’s drawing with no name on it',
          bin: 'no',
          why: 'Not okay: artists should be credited for their work.',
        },
      ],
      ara: { done: 'Trusted facts, labels, consent and credit. That is an honest poster.' },
    },
    {
      id: 'm07-c8',
      type: 'poll',
      question: 'Would you trust a poster more if it said "Made with AI"?',
      options: ['Yes, more', 'About the same', 'Less', 'It depends on who made it'],
      reflection: 'Thank you! There is no wrong answer. Many people trust honest labels more, and the facts still need to be checked. Next, you will make real posters.',
    },
  ],
  game: {
    slug: 'gawa-ko-to',
    name: "Gawa Ko 'To!",
    load: () => import('./GawaKoTo'),
  },
  takeaway: {
    id: 'm07-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust AI-made content that is labelled and checked by a person.',
      'Consent and credit are part of honest work: ask before using a face or voice, and name the artist.',
      'Health facts must come from trusted sources, such as the DOH, never from the AI itself.',
    ],
  },
};

export default content;
