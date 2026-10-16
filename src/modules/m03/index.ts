// Module 3 · AI and Your Health (docs/SPEC.md section 4): hook, seven lesson cards, the Tanong kay Chatbot game and the takeaway.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm03',
  review_status: 'unreviewed',
  hook: {
    id: 'm03-c1',
    type: 'story-hook',
    scene: "Bea's bedroom, midnight",
    speaker: 'Bea',
    line: 'I have a fever and a headache. Let me just ask the chatbot.',
    icon: 'sun',
    ara: {
      intro: 'Hey, Bea is asking a chatbot at midnight. Let us see how much it can really help.',
      done: 'Come on, let us learn when a chatbot helps and when it is time for a health worker.',
    },
  },
  cards: [
    {
      id: 'm03-c2',
      type: 'info',
      title: 'Chatbots predict likely words. They cannot examine you.',
      body: 'A chatbot writes the words that usually come next. It cannot take your temperature, listen to your chest or look at your throat. It can sound very sure and still be wrong. Use it to learn words and prepare questions, not to decide what is wrong with you.',
      icon: 'chat',
    },
    {
      id: 'm03-c3',
      type: 'reveal',
      title: 'Three kinds of answers',
      prompt: 'Tap each kind to see what it looks like and what to do.',
      tiles: [
        {
          label: 'Usable',
          detail: 'A general, well-known explanation, such as "Wash your hands with soap and water for at least 20 seconds." Fine to learn from. Still ask a health worker about your own case.',
        },
        {
          label: 'Wrong',
          detail: 'A confident answer that is not true, such as "Antibiotics work for every cough." Most coughs come from viruses, and antibiotics do not work on viruses. Do not act on it.',
        },
        {
          label: 'See a health worker now',
          detail: 'Some signs should never wait for a chat. Chest pain or trouble breathing needs a health worker right away. A good chatbot says so. A bad one keeps chatting.',
        },
      ],
      ara: { done: 'Usable, Wrong, Get checked. You will use these three in the game.' },
    },
    {
      id: 'm03-c4',
      type: 'swipe-sort',
      title: 'Get checked now, or ask at the health center?',
      bins: [
        { id: 'now', label: 'Get checked now' },
        { id: 'center', label: 'Ask at the health center' },
      ],
      items: [
        {
          id: 'm03-s1',
          text: 'Chest pain or tightness that does not go away',
          bin: 'now',
          why: 'Go now: chest pain can be an emergency. Get help right away.',
        },
        {
          id: 'm03-s2',
          text: 'A mild cold with a runny nose',
          bin: 'center',
          why: 'Health center: a mild cold usually passes with rest. Ask a health worker if it gets worse or lasts long.',
        },
        {
          id: 'm03-s3',
          text: 'Hard to breathe, or cannot speak a full sentence',
          bin: 'now',
          why: 'Go now: trouble breathing is always a reason to see a professional right away.',
        },
        {
          id: 'm03-s4',
          text: 'A small scratch on the knee, bleeding a little',
          bin: 'center',
          why: 'Health center: wash it with clean water and soap. Ask a health worker if it looks infected.',
        },
        {
          id: 'm03-s5',
          text: 'Fever days ago, now bad belly pain, vomiting and bleeding gums',
          bin: 'now',
          why: 'Go now: these are dengue warning signs. The danger can come when the fever goes down.',
        },
        {
          id: 'm03-s6',
          text: 'Face drooping, an arm that will not lift, or slurred speech',
          bin: 'now',
          why: 'Go now: these are stroke signs. Every minute matters.',
        },
      ],
      ara: { done: 'Red flags always go to a health worker. Do not wait for a chatbot to agree.' },
    },
    {
      id: 'm03-c5',
      type: 'choice',
      question: 'Bea asks: "Can I take Lola\'s leftover antibiotics for my cough?" Which chatbot answer is better?',
      options: [
        {
          text: '"Yes! Amoxicillin works for all coughs. Take 2 a day."',
          feedback: 'Oh no, that is wrong! It sounds sure, but most coughs come from viruses and antibiotics do not work on them. Never take medicine prescribed for someone else.',
        },
        {
          text: '"I cannot tell you what to take. Most coughs are not helped by antibiotics. Please ask a health worker or pharmacist."',
          feedback: 'Yes! An honest "I am not sure, please see a health worker" beats a confident cure. It also points you to a real person.',
        },
        {
          text: '"Take half of the pills, just to be safe."',
          feedback: 'No. Half a dose is still a guess, and a chatbot should not give doses at all.',
        },
      ],
      correct: 1,
      ara: { done: 'A good answer knows its limits.' },
    },
    {
      id: 'm03-c6',
      type: 'choice',
      question: 'What should you NOT type into a chatbot?',
      options: [
        {
          text: '"What does vitamin C do for the body?"',
          feedback: 'That is a general question. It does not say who you are, so it is safe to ask.',
        },
        {
          text: 'My full name, my PhilHealth number and my diagnosis',
          feedback: 'Yes! That is private health data. Once typed in, you may not get it back. Share the least you can.',
        },
        {
          text: '"How long should I wash my hands?"',
          feedback: 'A general question again. Nothing about you in it, so no problem.',
        },
      ],
      correct: 1,
    },
    {
      id: 'm03-c7',
      type: 'choice',
      question: 'A step-counter app asks to see your contacts and photos. Allow?',
      options: [
        {
          text: 'Allow both. It must need them',
          feedback: 'Not quite. A step counter counts steps. It does not need your contacts or your photos.',
        },
        {
          text: 'No. It does not need them',
          feedback: 'Yes! Allow only what the app needs to do its job. You can say no and the app should still work.',
        },
        {
          text: 'Allow photos only',
          feedback: 'Photos are private too. A step counter has no use for them. Ask "why does it need this?" first.',
        },
      ],
      correct: 1,
      ara: { done: 'In the game, you will decide on permissions yourself.' },
    },
    {
      id: 'm03-c8',
      type: 'reveal',
      title: 'AI helps doctors. It does not replace them.',
      prompt: 'Tap each tile to see how AI and doctors work together.',
      tiles: [
        {
          label: 'Reading X-rays',
          detail: 'Some hospitals use AI to mark spots on an X-ray for a doctor to look at first. It is a second pair of eyes.',
        },
        {
          label: 'The doctor decides',
          detail: 'The doctor looks at the picture, at you and at your history, and makes the decision. AI marks, the doctor decides.',
        },
        {
          label: 'The doctor is responsible',
          detail: 'A doctor answers for the care they give. A chatbot does not. That is why a health worker has the last word.',
        },
      ],
      ara: { done: 'AI is a helper in the clinic, not the doctor.' },
    },
  ],
  game: {
    slug: 'tanong-kay-chatbot',
    name: 'Tanong kay Chatbot',
    load: () => import('./TanongKayChatbot'),
  },
  takeaway: {
    id: 'm03-takeaway',
    type: 'takeaway',
    bullets: [
      'Use chatbots to learn words and prepare questions, not to diagnose you or tell you a dose.',
      'Check with a doctor or health worker before you act on an answer. Emergency signs? Skip the chat. Go to the health center now.',
      'Share the least data you can: keep your name, ID numbers and diagnosis out, and say no to permissions an app does not need.',
    ],
  },
};

export default content;
