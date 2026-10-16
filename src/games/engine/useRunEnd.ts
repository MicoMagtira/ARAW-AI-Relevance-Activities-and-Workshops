// The end of a DOM arcade run (Gawa, Tulog, Sapatos, Objection), matching GameShell's game over: the module jingle for a
// good run, the small XP chime otherwise. Plays once, when the end screen first shows.
import { useEffect } from 'preact/hooks';
import { sfx } from '../../app/sound';

export function useRunEndSound(goodRun: boolean): void {
  useEffect(() => sfx(goodRun ? 'complete' : 'xp'), []);
}
