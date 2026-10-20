// The small, always-loaded side of the how-to videos: a Watch button for any screen, the shared video dialog, and a lazy
// wrapper that downloads the player chunk only when a video is first shown.
import { useEffect, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { clipInfo, closeTutorial, defaultTutorialLang, formatDuration, hasTutorial, openTutorial, tutorialOpen } from '../../app/tutorials';
import { tutorialById, type TutorialId } from '../../content/tutorials';
import { Icon } from '../Icon';
import { Button, Dialog } from '../kit';

type PlayerModule = typeof import('./TutorialPlayer');
let loaded: PlayerModule | null = null;

/** The clip's title: the tour, or "How to play: <game>". */
export function tutorialTitle(id: TutorialId): string {
  const info = tutorialById(id);
  return info?.kind === 'game' && info.game ? t('tutorial.gameTitle', { game: info.game }) : t('tutorial.tourTitle');
}

/** Length of the clip in the language it would play in, e.g. "0:25", or '' when unknown. */
export function tutorialLength(id: TutorialId): string {
  const lang = defaultTutorialLang(id);
  const info = lang ? clipInfo(id, lang) : undefined;
  return info ? formatDuration(info.s) : '';
}

export function LazyTutorialPlayer({ id, autoplay, transcript }: { id: TutorialId; autoplay?: boolean; transcript?: boolean }) {
  const [mod, setMod] = useState<PlayerModule | null>(loaded);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (mod) return;
    let live = true;
    import('./TutorialPlayer').then(
      (m) => {
        loaded = m;
        if (live) setMod(m);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);
  if (mod) return <mod.TutorialPlayer id={id} title={tutorialTitle(id)} autoplay={autoplay} transcript={transcript} />;
  return (
    <p class="lesson-loading" role="status">
      {failed ? t('tutorial.cantPlay') : t('tutorial.loading')}
    </p>
  );
}

interface WatchProps {
  id: TutorialId;
  /** Button text; defaults to "Watch how to play". */
  label?: string;
  variant?: 'gold' | 'secondary';
  class?: string;
  /** Open somewhere else (the game's own How to play dialog) instead of the shared video dialog. */
  onWatch?: () => void;
}

/** Opens the clip in the shared dialog. Renders nothing for a clip that was not recorded. */
export function WatchButton({ id, label, variant = 'secondary', class: className, onWatch }: WatchProps) {
  if (!hasTutorial(id)) return null;
  const length = tutorialLength(id);
  return (
    <Button variant={variant} class={className ? `watch-btn ${className}` : 'watch-btn'} onClick={onWatch ?? (() => openTutorial(id))}>
      <Icon name="video" />
      {label ?? t('tutorial.watch')}
      {length && <span class="watch-btn__time">{length}</span>}
    </Button>
  );
}

/** The shared video dialog; mounted once in the shell (normal and focus mode). */
export function TutorialHost() {
  const id = tutorialOpen.value;
  return (
    <Dialog open={id !== null} title={id ? tutorialTitle(id) : ''} onClose={closeTutorial} class="px-dialog--video">
      {id && <LazyTutorialPlayer id={id} autoplay key={id} />}
    </Dialog>
  );
}
