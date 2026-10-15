import { t } from '../app/i18n';
import { Soon } from './Soon';

export function Library() {
  return <Soon heading={t('nav.library')} introKey="library.intro" />;
}
