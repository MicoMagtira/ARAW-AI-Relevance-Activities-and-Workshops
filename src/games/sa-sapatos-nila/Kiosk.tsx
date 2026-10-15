// The health-center kiosk as one visitor sees it. The simulation filters (blur, a dark screen, unfamiliar-language text, missing
// captions, buttons above the reach line) are drawn ONLY inside this box, on the kiosk's own text, so the game's own controls
// stay sharp and readable. Every filtered piece keeps its real text for screen readers, and the stuck/feel lines beside the kiosk
// say in words what the filter shows.
import type { ComponentChildren } from 'preact';
import { t } from '../../app/i18n';
import { Icon } from '../../ui/Icon';
import { LANG_NAME, SCREENS, STEP_COUNT, barrierById, type FixId, type Persona, type StepId } from './data';
import { scramble, unmetBarriers } from './sim';

/** A pixel QR code (7 x 7), for the "scan with your phone" screen. */
const QR: readonly string[] = ['#######', '#.#.#.#', '#.###.#', '###.###', '#.###.#', '#.#.#.#', '#######'];

function Qr() {
  const cells: ComponentChildren[] = [];
  QR.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '#') cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }),
  );
  return (
    <svg class="kiosk__qr" viewBox="0 0 7 7" role="img" aria-label={t('sapatos.kiosk.qr')} shape-rendering="crispEdges">
      <rect width="7" height="7" fill="var(--surface)" />
      <g fill="var(--ink)">{cells}</g>
    </svg>
  );
}

/** Text that may look like another language: the look-alike is hidden from screen readers, the real words are not. */
function Txt({ text, garbled }: { text: string; garbled: boolean }) {
  if (!garbled) return <>{text}</>;
  return (
    <>
      <span aria-hidden="true">{scramble(text)}</span>
      <span class="sr-only">{text}</span>
    </>
  );
}

interface Props {
  persona: Persona;
  installed: readonly FixId[];
  step: StepId;
  /** Press the button on this screen. */
  onPress: () => void;
  /** Present when the assisted counter is installed. */
  onCounter?: () => void;
}

export function Kiosk({ persona, installed, step, onPress, onCounter }: Props) {
  const unmet = unmetBarriers(persona, installed);
  const has = (b: string): boolean => unmet.some((u) => u === b);
  const garbled = unmet.some((u) => u.startsWith('lang-'));
  const language = persona.barriers.find((b) => b.startsWith('lang-'));
  const langName = language ? LANG_NAME[language.slice(5) as keyof typeof LANG_NAME] : null;
  const dark = has('blind');
  const blurred = has('blur');
  const large = installed.includes('large-text');
  const lowered = installed.includes('lower');
  const voice = installed.includes('voice');
  const captions = installed.includes('captions');
  const reachLine = persona.barriers.includes('reach');
  const noSound = has('sound');
  const screen = SCREENS[Math.min(step, STEP_COUNT - 1)] ?? SCREENS[0]!;

  const cls = ['kiosk', blurred && 'kiosk--blur', dark && 'kiosk--dark', large && 'kiosk--large'].filter(Boolean).join(' ');

  const button = (
    <button type="button" class="kiosk__btn px-btn px-btn--gold" onClick={onPress} data-kiosk-press>
      <span class="kiosk__fx">
        <Txt text={screen.button} garbled={garbled} />
      </span>
    </button>
  );

  return (
    <div class={cls} role="group" aria-label={t('sapatos.kiosk.label')}>
      <div class="kiosk__bar">
        <Icon name="info" size={16} />
        <span class="kiosk__brand">{t('sapatos.kiosk.brand')}</span>
        {langName && installed.includes(`lang-${language?.slice(5)}` as FixId) && <span class="kiosk__lang">{t('sapatos.kiosk.lang', { lang: langName })}</span>}
      </div>
      <div class="kiosk__screen">
        <p class="kiosk__step" role="status">
          {t('sapatos.kiosk.step', { n: Math.min(step + 1, STEP_COUNT), total: STEP_COUNT })}
        </p>
        <div class="kiosk__zone kiosk__zone--high">{!lowered && button}</div>
        <div class="kiosk__body">
          <h4 class="kiosk__title kiosk__fx">
            <Txt text={screen.title} garbled={garbled} />
          </h4>
          <p class="kiosk__text kiosk__fx">
            <Txt text={step === 2 && captions ? t('sapatos.kiosk.number') : screen.text} garbled={garbled} />
          </p>
          {step === 0 && <Qr />}
        </div>
        {reachLine && (
          <div class="kiosk__reach" aria-hidden="true">
            <span>{t('sapatos.kiosk.reach')}</span>
          </div>
        )}
        <div class="kiosk__zone kiosk__zone--low">{lowered && button}</div>
      </div>
      <div class="kiosk__feed">
        <p class="kiosk__sound">
          <Icon name={noSound ? 'close' : 'phone-call'} size={16} />
          {noSound ? (
            <span>{t('sapatos.kiosk.soundOnly')}</span>
          ) : (
            <span class="kiosk__fx">
              {captions ? t('sapatos.kiosk.captions') : t('sapatos.kiosk.says')} <Txt text={`"${screen.sound}"`} garbled={garbled} />
            </span>
          )}
        </p>
        {voice && (
          <p class="kiosk__sound">
            <Icon name="phone-call" size={16} />
            <span class="kiosk__fx">
              {garbled ? t('sapatos.kiosk.voiceLang') : t('sapatos.kiosk.voice')} {!garbled && <Txt text={`"${screen.text}"`} garbled={false} />}
            </span>
          </p>
        )}
      </div>
      {onCounter && (
        <div class="kiosk__counter">
          <button type="button" class="px-btn px-btn--secondary" onClick={onCounter}>
            <Icon name="me" size={20} />
            {t('sapatos.kiosk.counter')}
          </button>
        </div>
      )}
    </div>
  );
}

/** What each active barrier looks like, in words, with the fixed ones ticked off. */
export function FeelList({ persona, installed }: { persona: Persona; installed: readonly FixId[] }) {
  const unmet = unmetBarriers(persona, installed);
  return (
    <ul class="sapatos-feel">
      {persona.barriers.map((b) => {
        const info = barrierById(b);
        const fixed = !unmet.includes(b);
        return (
          <li key={b} class={fixed ? 'is-fixed' : undefined}>
            <span class="sapatos-feel__tag">
              <Icon name={fixed ? 'check' : 'eye'} size={16} />
              {fixed ? t('sapatos.feel.fixed') : info.filter}
            </span>{' '}
            {fixed ? t('sapatos.feel.fixedText', { name: persona.name }) : info.feel.replaceAll('{name}', persona.name)}
          </li>
        );
      })}
    </ul>
  );
}
