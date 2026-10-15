// Starter myths for "Myth of the day". The Library task grows this into the full myth bank.
export interface MythSeed {
  id: string;
  myth: string;
  fact: string;
  review_status: 'unreviewed';
}

export const MYTH_SEEDS: readonly MythSeed[] = [
  {
    id: 'tawa-tawa-dengue',
    myth: 'Tawa-tawa cures dengue.',
    fact: 'No herb is proven to cure dengue. If you have a high fever, see a health worker early.',
    review_status: 'unreviewed',
  },
  {
    id: 'antibiotics-colds',
    myth: 'Antibiotics cure colds and flu.',
    fact: 'Colds and flu come from viruses. Antibiotics only work on bacteria. Ask a health worker first.',
    review_status: 'unreviewed',
  },
  {
    id: 'forwarded-many-times',
    myth: 'If a message was forwarded many times, it must be true.',
    fact: 'Many shares do not make a claim true. Check the source before you forward.',
    review_status: 'unreviewed',
  },
  {
    id: 'chatbot-always-right',
    myth: 'A chatbot always tells the truth.',
    fact: 'Chatbots can sound sure and still be wrong. Check health answers with a health worker.',
    review_status: 'unreviewed',
  },
  {
    id: 'natural-is-safe',
    myth: 'If it is natural, it is always safe.',
    fact: 'Natural does not mean safe. Some herbs can harm you or clash with medicines.',
    review_status: 'unreviewed',
  },
];
