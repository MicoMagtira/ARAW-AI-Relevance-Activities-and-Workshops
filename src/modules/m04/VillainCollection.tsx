// The villain card collection: five collectible cards. A beaten villain shows its full card; the others show a silhouette and progress.
import { t } from '../../app/i18n';
import { tacticStreaks, villainCards } from '../../app/progress';
import { BADGES } from '../../content/badges';
import { VILLAINS, type Villain } from '../../content/tactics';
import { Icon } from '../../ui/Icon';
import { Chip } from '../../ui/kit';
import { VillainPortrait } from '../../ui/VillainPortrait';
import { HITS_TO_DEFEAT, heartsLeft } from './tacticLogic';

/** Pixel hearts: the hearts a villain has left, with a text label for assistive tech. */
export function Hearts({ name, left, size = 24 }: { name: string; left: number; size?: number }) {
  return (
    <span class="tt-hearts" role="img" aria-label={t('tt.hearts', { name, n: left })}>
      {Array.from({ length: HITS_TO_DEFEAT }, (_, i) => (
        <Icon key={i} name={i < left ? 'heart-solid' : 'heart'} size={size} class={i < left ? 'tt-heart tt-heart--full' : 'tt-heart'} />
      ))}
    </span>
  );
}

function VillainCard({ v, beaten, streak, fresh }: { v: Villain; beaten: boolean; streak: number; fresh: boolean }) {
  const badge = BADGES.find((b) => b.id === v.badgeId);
  return (
    <li class={`tt-card px-box${beaten ? ' tt-card--won' : ' tt-card--locked'}${fresh ? ' tt-card--fresh' : ''}`} aria-labelledby={`tt-card-${v.id}`}>
      <div class="tt-card__top">
        <VillainPortrait id={v.id} size={96} locked={!beaten} decorative />
        <div class="tt-card__head">
          <h4 class="tt-card__name" id={`tt-card-${v.id}`}>
            {v.name}
          </h4>
          <p class="tt-card__trick">{v.trick}</p>
          {beaten ? <Chip kind="fact">{t('tt.card.beaten')}</Chip> : <Hearts name={v.name} left={heartsLeft(streak, false)} size={20} />}
        </div>
      </div>
      <p class="tt-card__tagline">{v.tagline}</p>
      {beaten ? (
        <div class="tt-card__body">
          <p class="tt-card__label">{t('tt.card.tells')}</p>
          <ul>
            {v.tells.map((tell) => (
              <li key={tell}>{tell}</li>
            ))}
          </ul>
          <p>
            <strong>{t('tt.card.counter')}:</strong> {v.counter}
          </p>
          <p class="px-text-muted">{t('tt.card.ara', { line: v.ara })}</p>
          {badge && <p class="tt-card__badge">{t('tt.card.badge', { name: badge.name })}</p>}
        </div>
      ) : (
        <p class="px-text-muted tt-card__locked">
          <Icon name="lock" size={20} />
          <span>{t('tt.card.locked', { n: Math.min(streak, HITS_TO_DEFEAT) })}</span>
        </p>
      )}
    </li>
  );
}

interface VillainCollectionProps {
  /** Villain ids just beaten in this play, highlighted as new. */
  fresh?: readonly string[];
  headingLevel?: 3 | 4;
}

/** Reads the saved cards and streaks, so it is always up to date. */
export function VillainCollection({ fresh = [], headingLevel = 3 }: VillainCollectionProps) {
  const beaten = villainCards.value;
  const streaks = tacticStreaks.value;
  const Heading = `h${headingLevel}` as 'h3' | 'h4';
  return (
    <section class="tt-collection" aria-labelledby="tt-collection-title">
      <div class="tt-collection__head">
        <Heading class="tt-title" id="tt-collection-title">
          {t('tt.collection')}
        </Heading>
        <Chip kind="xp">{t('tt.collected', { n: VILLAINS.filter((v) => beaten.includes(v.id)).length, total: VILLAINS.length })}</Chip>
      </div>
      <ul class="tt-cards">
        {VILLAINS.map((v) => (
          <VillainCard key={v.id} v={v} beaten={beaten.includes(v.id)} streak={streaks[v.id] ?? 0} fresh={fresh.includes(v.id)} />
        ))}
      </ul>
    </section>
  );
}
