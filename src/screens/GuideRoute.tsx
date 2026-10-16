// "How to use ARAW" route (`#/guide`). The guide and its screenshots load only when it is opened.
import { LazyScreen } from './LazyScreen';

const load = () => import('./guide/Guide');

export function GuideRoute() {
  return <LazyScreen load={load} />;
}
