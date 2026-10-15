// The people whose feeds you curate. All fictional. Tita Baby is first; the rest come in a seeded random order.
import { shuffle, type Rng } from '../engine/rng';
import type { TopicId } from './rules';

export interface Look {
  hair: string;
  skin: string;
  shirt: string;
  glasses?: boolean;
}

export interface Persona {
  id: string;
  /** Upper case, 11 characters at most (it is drawn on the canvas). */
  name: string;
  /** Topics they like (3 each). */
  interests: readonly TopicId[];
  look: Look;
}

export const TITA: Persona = {
  id: 'tita-baby',
  name: 'TITA BABY',
  interests: ['food', 'family', 'showbiz'],
  look: { hair: '#1f2550', skin: '#e2a77e', shirt: '#ff7a59' },
};

export const OTHERS: readonly Persona[] = [
  { id: 'lola-nena', name: 'LOLA NENA', interests: ['family', 'news', 'clinic'], look: { hair: '#c9c9d6', skin: '#e2a77e', shirt: '#1e7d50', glasses: true } },
  { id: 'kuya-jun', name: 'KUYA JUN', interests: ['sports', 'news', 'food'], look: { hair: '#1f2550', skin: '#c98a5e', shirt: '#35408e' } },
  { id: 'aling-cora', name: 'ALING CORA', interests: ['food', 'news', 'showbiz'], look: { hair: '#4a4f6a', skin: '#e2a77e', shirt: '#e8b84a' } },
  { id: 'ate-rina', name: 'ATE RINA', interests: ['showbiz', 'family', 'sports'], look: { hair: '#1f2550', skin: '#f0c19a', shirt: '#c4323a' } },
  { id: 'mang-teddy', name: 'MANG TEDDY', interests: ['sports', 'news', 'family'], look: { hair: '#4a4f6a', skin: '#c98a5e', shirt: '#1e7d50', glasses: true } },
  { id: 'kuya-jojo', name: 'KUYA JOJO', interests: ['sports', 'showbiz', 'food'], look: { hair: '#1f2550', skin: '#e2a77e', shirt: '#ff7a59' } },
  { id: 'nurse-carla', name: 'NURSE CARLA', interests: ['clinic', 'family', 'news'], look: { hair: '#1f2550', skin: '#f0c19a', shirt: '#e3e6f5' } },
  { id: 'ate-mae', name: 'ATE MAE', interests: ['showbiz', 'food', 'clinic'], look: { hair: '#8a4b2a', skin: '#e2a77e', shirt: '#35408e' } },
  { id: 'tita-mely', name: 'TITA MELY', interests: ['family', 'food', 'news'], look: { hair: '#c9c9d6', skin: '#f0c19a', shirt: '#c4323a', glasses: true } },
];

/** Endless sequence of users: Tita Baby first, then the others in a seeded shuffle (reshuffled when used up, never the same twice in a row). */
export function createUserQueue(rng: Rng): () => Persona {
  let first = true;
  let order: Persona[] = [];
  let last: Persona = TITA;
  return () => {
    if (first) {
      first = false;
      return TITA;
    }
    if (order.length === 0) {
      order = shuffle(OTHERS, rng);
      if (order[order.length - 1] === last) order.reverse();
    }
    last = order.pop() as Persona;
    return last;
  };
}
