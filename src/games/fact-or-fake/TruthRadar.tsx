// Truth Radar panel (docs/SPEC.md section 6, docs/DESIGN.md section 11.5): two plain-language pixel meters.
// The raw d-prime and c values stay behind a "details" disclosure.
import type { CSSProperties } from 'preact';
import { t } from '../../app/i18n';
import { Meter } from '../../ui/kit';
import { AraSays } from '../../ui/AraBubble';
import { BALANCED_C, LEAN_LIMIT, radarFor, type RoundScore } from './scoring';

const ZONE_START = ((-BALANCED_C + LEAN_LIMIT) / (2 * LEAN_LIMIT)) * 100;
const ZONE_WIDTH = ((2 * BALANCED_C) / (2 * LEAN_LIMIT)) * 100;

export function TruthRadar({ score }: { score: RoundScore }) {
  const radar = radarFor(score);
  const leanText = t(`radar.lean.${radar.lean}` as const);
  const accText = t(`radar.acc.${radar.accuracyLabel}` as const);
  return (
    <div class="radar stack">
      {radar.rough && <p class="radar__rough">{t('radar.rough')}</p>}

      <div class="radar__block">
        <Meter value={radar.accuracy} label={t('radar.accuracy')} />
        <p class="radar__verdict">{accText}</p>
      </div>

      <div class="radar__block">
        <span class="px-meter-wrap__label" id="radar-lean-label">
          {t('radar.leanTitle')}
        </span>
        <div
          class="radar__lean"
          role="img"
          aria-labelledby="radar-lean-label"
          aria-describedby="radar-lean-value"
          style={{ '--zone-start': `${ZONE_START}%`, '--zone-width': `${ZONE_WIDTH}%`, '--lean': `${radar.leanPosition}%` } as CSSProperties}
        >
          <span class="radar__zone" />
          <span class="radar__pin" />
        </div>
        <div class="radar__ends" aria-hidden="true">
          <span>{t('radar.endDoubtful')}</span>
          <span>{t('radar.zone')}</span>
          <span>{t('radar.endTrusting')}</span>
        </div>
        <p class="radar__verdict" id="radar-lean-value">
          {leanText}
        </p>
      </div>

      <AraSays mood={radar.lean === 'balanced' ? 'happy' : 'think'} scale={3} class="radar__ara">
        <p>{t(`radar.tip.${radar.lean}` as const)}</p>
      </AraSays>

      <details class="radar__details">
        <summary>{t('radar.details')}</summary>
        <dl class="stat-list">
          <div>
            <dt>{t('radar.dPrime')}</dt>
            <dd>{score.dPrime.toFixed(2)}</dd>
          </div>
          <div>
            <dt>{t('radar.c')}</dt>
            <dd>{score.c.toFixed(2)}</dd>
          </div>
          <div>
            <dt>{t('radar.hit')}</dt>
            <dd>{Math.round(score.hitRate * 100)}%</dd>
          </div>
          <div>
            <dt>{t('radar.falseAlarm')}</dt>
            <dd>{Math.round(score.falseAlarmRate * 100)}%</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
