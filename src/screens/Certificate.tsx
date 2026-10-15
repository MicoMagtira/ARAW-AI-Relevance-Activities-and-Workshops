// Certificate route (`#/certificate`), shown in focus mode. The drawing code loads only when it is opened.
import { LazyScreen } from './LazyScreen';

const load = () => import('./certificate/CertificateScreen');

export function Certificate() {
  return <LazyScreen load={load} />;
}
