// Daily Challenge route (`#/daily`). The screen and the Fact or Fake items load only when it is opened.
import { LazyScreen } from './LazyScreen';

const load = () => import('./daily/DailyScreen');

export function Daily() {
  return <LazyScreen load={load} />;
}
