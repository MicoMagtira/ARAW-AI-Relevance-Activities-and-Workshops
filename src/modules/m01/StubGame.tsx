// Placeholder module game. T07 replaces it with "AI or Not?". Shows the contract: onComplete always counts.
import { AraSays } from '../../ui/AraBubble';
import { Button } from '../../ui/kit';
import type { ModuleGameProps } from '../types';

export default function StubGame({ onComplete }: ModuleGameProps) {
  return (
    <div class="stack">
      <AraSays mood="wink" scale={3}>
        <p>The real game, AI or Not?, is coming soon. For now, tap the button to finish it.</p>
      </AraSays>
      <div>
        <Button variant="gold" onClick={() => onComplete(2)}>
          Finish the game
        </Button>
      </div>
    </div>
  );
}
