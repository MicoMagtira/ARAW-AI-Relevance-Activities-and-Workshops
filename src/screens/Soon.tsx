import type { ComponentChildren } from 'preact';
import { t, type StringKey } from '../app/i18n';
import { Chip, Panel } from '../ui/kit';

/** Placeholder panel used until a screen is built. */
export function Soon({ heading, introKey, children }: { heading: string; introKey: StringKey; children?: ComponentChildren }) {
  return (
    <div class="grid-12">
      <Panel class="span-8" aria-labelledby="soon-h">
        <div class="soon__band px-sunrise" aria-hidden="true" />
        <div class="stack">
          <Chip>{t('soon.kicker')}</Chip>
          <h2 id="soon-h">{heading}</h2>
          <p>{t(introKey)}</p>
          <p class="px-text-muted">{t('soon.text')}</p>
          {children}
        </div>
      </Panel>
    </div>
  );
}
