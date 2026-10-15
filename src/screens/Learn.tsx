import { t } from '../app/i18n';
import { Soon } from './Soon';

export function Learn() {
  return <Soon heading={t('nav.learn')} introKey="learn.intro" />;
}
