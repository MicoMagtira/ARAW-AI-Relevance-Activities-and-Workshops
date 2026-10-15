import { t } from '../app/i18n';
import { hrefFor } from '../app/router';
import { Button } from '../ui/kit';
import { Soon } from './Soon';

export function Arcade() {
  return (
    <Soon heading={t('nav.arcade')} introKey="arcade.intro">
      <div class="stack">
        <h3>{t('arcade.fof')}</h3>
        <p>{t('arcade.fofText')}</p>
        <div>
          <Button href={hrefFor('/play/fact-or-fake')} variant="gold">
            {t('arcade.fofPlay')}
          </Button>
        </div>
      </div>
    </Soon>
  );
}
