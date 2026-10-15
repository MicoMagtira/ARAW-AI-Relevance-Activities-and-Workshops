import { t } from '../app/i18n';
import { hrefFor } from '../app/router';
import { Button, Panel } from '../ui/kit';
import { Icon } from '../ui/Icon';

export function NotFound() {
  return (
    <div class="grid-12">
      <Panel class="span-8" aria-labelledby="nf-h">
        <div class="stack">
          <Icon name="sun" size={96} />
          <h2 id="nf-h">{t('notFound.title')}</h2>
          <p>{t('notFound.text')}</p>
          <div>
            <Button href={hrefFor('/')} variant="gold">
              {t('notFound.home')}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
