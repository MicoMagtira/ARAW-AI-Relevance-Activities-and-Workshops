// Ara's first-run briefing: five short pages (about 12 seconds each), always skippable, replayable from How to play.
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { araSay, sfx } from '../../app/sound';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { Button, Panel } from '../../ui/kit';
import type { BriefingPage } from './types';

interface Props {
  pages: readonly BriefingPage[];
  /** Last page's Start button. */
  onStart: () => void;
  /** Skip button: leave the briefing without starting. */
  onSkip: () => void;
  /** Last page's button label (defaults to Start). */
  startLabel?: string;
  /** "Watch a short video": shown when the game has a how-to clip. */
  onWatch?: () => void;
}

export function Briefing({ pages, onStart, onSkip, startLabel, onWatch }: Props) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const page = pages[Math.min(index, pages.length - 1)];
  const last = index >= pages.length - 1;
  const short = useMediaQuery('(height < 520px) and (orientation: landscape)');

  // Each new page: move focus to its heading so keyboard and screen-reader users hear it
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);
  // Ara reads each page out in her blip voice (idle pages stay quiet).
  useEffect(() => {
    if (page) araSay(page.text, page.mood ?? 'happy');
  }, [index]);

  if (!page) return null;
  const go = (next: number) => {
    const to = Math.max(0, Math.min(pages.length - 1, next));
    if (to !== index) sfx('page');
    setIndex(to);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && !last) go(index + 1);
    else if (e.key === 'ArrowLeft' && index > 0) go(index - 1);
  };

  return (
    <Panel class="briefing" aria-labelledby="briefing-h">
      <div class="briefing__body" onKeyDown={onKey}>
        <AraSays mood={page.mood ?? 'happy'} scale={short ? 3 : 5} class="briefing__ara">
          <h2 id="briefing-h" tabIndex={-1} ref={heading}>
            {page.title}
          </h2>
          <p>{page.text}</p>
        </AraSays>
        <div class="briefing__dots" role="img" aria-label={t('game.briefing.page', { n: index + 1, total: pages.length })}>
          {pages.map((_, i) => (
            <i key={i} class={i === index ? 'on' : i < index ? 'seen' : ''} />
          ))}
        </div>
        <p class="briefing__page px-label">{t('game.briefing.page', { n: index + 1, total: pages.length })}</p>
        {onWatch && (
          // a quiet link-style button under the page count, so Skip / Back / Next keep their row on every screen
          <button type="button" class="briefing__watch" onClick={onWatch}>
            <Icon name="video" size={20} />
            {t('tutorial.briefingWatch')}
          </button>
        )}
      </div>
      <div class="briefing__actions">
        <Button variant="secondary" onClick={onSkip}>
          {t('game.briefing.skip')}
        </Button>
        <span class="briefing__nav">
          {index > 0 && (
            <Button variant="secondary" data-sfx="none" onClick={() => go(index - 1)}>
              {t('game.briefing.back')}
            </Button>
          )}
          {last ? (
            <Button variant="gold" data-sfx={startLabel ? 'open' : 'start'} onClick={onStart}>
              {startLabel ?? t('game.briefing.start')}
            </Button>
          ) : (
            <Button variant="gold" data-sfx="none" onClick={() => go(index + 1)}>
              {t('game.briefing.next')}
            </Button>
          )}
        </span>
      </div>
    </Panel>
  );
}
