// The how-to video player (its own chunk, loaded on first use). Native controls for play, seek and full screen; the
// captions show in a large text bar under the picture (so they grow with Larger text and never cover the game), and as the
// browser's own captions in full screen. A language row swaps only the video. The full transcript is one tap away.
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { ALL_LANGUAGES, type LanguageCode } from '../../app/language';
import {
  captionSrc,
  captionsOn,
  clipInfo,
  defaultTutorialLang,
  formatDuration,
  formatMb,
  parseVtt,
  tutorialLangs,
  videoSrc,
} from '../../app/tutorials';
import type { TutorialId } from '../../content/tutorials';
import { Icon } from '../Icon';
import { useReducedMotion } from '../Ara';
import { Switch } from '../kit';
import '../../styles/tutorial.css';

interface Props {
  id: TutorialId;
  /** Accessible name of the video (the clip title). */
  title: string;
  /** Start playing at once (muted: the clips have no sound). Never with reduced motion. */
  autoplay?: boolean;
  /** "Read all the captions". Off where the same lines are already printed next to the video (a game's How to play). */
  transcript?: boolean;
}

/** Text of the cue showing now, from the hidden caption track. */
function activeCueText(track: TextTrack | null): string {
  const cues = track?.activeCues;
  if (!cues || cues.length === 0) return '';
  return Array.from(cues, (cue) => ('text' in cue ? String(cue.text) : '')).join(' ').replace(/<[^>]+>/g, '');
}

function inFullScreen(video: HTMLVideoElement): boolean {
  return document.fullscreenElement === video || (video as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean }).webkitDisplayingFullscreen === true;
}

export function TutorialPlayer({ id, title, autoplay = false, transcript = true }: Props) {
  const langs = tutorialLangs(id);
  const [lang, setLang] = useState<LanguageCode>(() => defaultTutorialLang(id) ?? 'en');
  const [cue, setCue] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const resume = useRef<{ at: number; play: boolean } | null>(null);
  const reduced = useReducedMotion();
  const uid = useId();
  const captions = captionsOn.value;
  const info = clipInfo(id, lang);

  // One video element per language (keyed): wire its caption track, full-screen captions, errors and the resume point.
  useEffect(() => {
    const video = videoRef.current;
    const track = trackRef.current?.track ?? null;
    setFailed(false);
    setCue('');
    if (!video) return;
    const syncMode = () => {
      if (track) track.mode = captionsOn.value && inFullScreen(video) ? 'showing' : 'hidden';
    };
    const onCue = () => setCue(activeCueText(track));
    const onMeta = () => {
      const r = resume.current;
      resume.current = null;
      if (!r) return;
      if (r.at > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(r.at, Math.max(0, video.duration - 0.5));
      if (r.play) void video.play().catch(() => {});
    };
    const onError = () => setFailed(true);
    const onPlay = () => setStarted(true);
    syncMode();
    track?.addEventListener('cuechange', onCue);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('error', onError);
    video.addEventListener('play', onPlay);
    video.addEventListener('webkitbeginfullscreen', syncMode);
    video.addEventListener('webkitendfullscreen', syncMode);
    document.addEventListener('fullscreenchange', syncMode);
    return () => {
      track?.removeEventListener('cuechange', onCue);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('error', onError);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('webkitbeginfullscreen', syncMode);
      video.removeEventListener('webkitendfullscreen', syncMode);
      document.removeEventListener('fullscreenchange', syncMode);
    };
  }, [lang, captions]);

  // The transcript, straight from the caption file (works even when the browser cannot play the video).
  useEffect(() => {
    let live = true;
    setLines([]);
    fetch(captionSrc(id, lang))
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => live && setLines(parseVtt(text)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id, lang]);

  const pickLang = (next: LanguageCode) => {
    if (next === lang) return;
    const video = videoRef.current;
    resume.current = video ? { at: video.currentTime, play: !video.paused && !video.ended } : null;
    setLang(next);
  };

  const langName = ALL_LANGUAGES.find((l) => l.code === lang)?.name ?? lang;

  return (
    <figure class="tutorial" aria-labelledby={`${uid}-t`}>
      <figcaption class="sr-only" id={`${uid}-t`}>
        {title}
      </figcaption>
      <div class="tutorial__screen">
        <video
          key={lang}
          ref={videoRef}
          class="tutorial__video"
          src={videoSrc(id, lang)}
          controls
          playsInline
          muted
          autoPlay={autoplay && !reduced}
          preload="metadata"
          lang={lang}
          aria-label={title}
          aria-describedby={captions ? `${uid}-c` : undefined}
        >
          <track ref={trackRef} kind="captions" src={captionSrc(id, lang)} srcLang={lang} label={langName} default />
        </video>
      </div>

      {captions && (
        <p class="tutorial__caption" id={`${uid}-c`} lang={lang} aria-live="polite">
          {cue || (started ? ' ' : (lines[0] ?? ' '))}
        </p>
      )}
      {failed && (
        <p class="tutorial__error" role="alert">
          {t('tutorial.cantPlay')}
        </p>
      )}

      <div class="tutorial__controls">
        <label class="tutorial__cc">
          <Icon name="captions" />
          <span id={`${uid}-cc`}>{t('tutorial.captions')}</span>
          <Switch checked={captions} onChange={(on) => (captionsOn.value = on)} aria-labelledby={`${uid}-cc`} />
        </label>
        {langs.length > 1 && (
          <div class="tutorial__langs" role="group" aria-labelledby={`${uid}-l`} aria-describedby={`${uid}-lh`}>
            <span class="tutorial__langs-label" id={`${uid}-l`}>
              {t('tutorial.language')}
            </span>
            <span class="tutorial__langs-row">
              {langs.map((code) => {
                const def = ALL_LANGUAGES.find((l) => l.code === code);
                return (
                  <button
                    key={code}
                    type="button"
                    class="tutorial__lang"
                    lang={code}
                    aria-pressed={code === lang}
                    aria-label={def?.name ?? code}
                    data-sfx="tab"
                    onClick={() => pickLang(code)}
                  >
                    {def?.tag ?? code}
                  </button>
                );
              })}
            </span>
          </div>
        )}
      </div>
      <p class="tutorial__meta">
        {info && <span>{t('tutorial.meta', { time: formatDuration(info.s), size: formatMb(info.kb) })}</span>}
        {langs.length > 1 && <span id={`${uid}-lh`}>{t('tutorial.languageHint')}</span>}
      </p>

      {transcript && lines.length > 0 && (
        <details class="tutorial__transcript">
          <summary>{t('tutorial.transcript')}</summary>
          <ol lang={lang}>
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </details>
      )}
    </figure>
  );
}
