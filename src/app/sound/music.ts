// Background music per area of the app (docs/DESIGN.md "Sound"): a warm morning theme for the everyday screens, a calm
// study theme inside lessons and Fact or Fake, an upbeat arcade theme for games and a victory theme for the certificate.
import { effect } from '@preact/signals';
import { splashVisible } from '../boot';
import { location$, matchRoute } from '../router';
import type { RouteName } from '../routes';
import { setMusic, type TrackId } from './index';

const TRACKS: Record<RouteName, TrackId> = {
  home: 'umaga',
  learn: 'umaga',
  library: 'umaga',
  me: 'umaga',
  daily: 'umaga',
  about: 'umaga',
  guide: 'umaga',
  report: 'umaga',
  notFound: 'umaga',
  lesson: 'aral',
  fof: 'aral',
  assess: 'aral',
  arcade: 'laro',
  game: 'laro',
  certificate: 'panalo',
};

/** The track for a screen. The splash plays the morning theme. */
export function trackFor(route: RouteName, splash = false): TrackId {
  return splash ? 'umaga' : TRACKS[route];
}

/** Follow the router (and the splash) with the music. Returns a stop function. */
export function initMusic(): () => void {
  return effect(() => {
    setMusic(trackFor(matchRoute(location$.value).def.name, splashVisible.value));
  });
}
