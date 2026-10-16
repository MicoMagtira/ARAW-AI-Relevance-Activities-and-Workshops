// Sound controls, shaped like TALA's: Music and Sound effects, each with a switch and a volume slider (docs/DESIGN.md
// sections 5.6, 5.7 and "Sound"). The Me screen shows the full group; the splash shows the two switches only.
import type { CSSProperties } from 'preact';
import { useId } from 'preact/hooks';
import { t } from '../app/i18n';
import { sfx } from '../app/sound';
import { setSound, soundPrefs } from '../app/sound/prefs';
import { Switch, SwitchRow } from './kit';

/** Turning effects on: the click listener was still muted at the moment of the tap, so confirm it here. */
function setEffects(next: boolean): void {
  setSound('sfxOn', next);
  if (next) sfx('toggleOn');
}

interface VolumeProps {
  label: string;
  value: number;
  on: boolean;
  onInput: (v: number) => void;
  /** Released (pointer up or a key step): used for the effects preview blip. */
  onCommit?: () => void;
}

function Volume({ label, value, on, onInput, onCommit }: VolumeProps) {
  const id = useId();
  return (
    <div class={`volume-row${on ? '' : ' volume-row--off'}`}>
      <label class="volume-row__label px-label" for={id}>
        {label}
      </label>
      <input
        id={id}
        class="px-range"
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={!on}
        aria-valuetext={t('sound.volumeValue', { n: value })}
        aria-describedby={on ? undefined : `${id}-off`}
        style={{ '--fill': `${value}%` } as CSSProperties}
        onInput={(e) => onInput(Number((e.target as HTMLInputElement).value))}
        onChange={() => onCommit?.()}
      />
      <span class="volume-row__value" aria-hidden="true">
        {value}
      </span>
      {!on && (
        <span class="sr-only" id={`${id}-off`}>
          {t('sound.off')}
        </span>
      )}
    </div>
  );
}

/** Me screen: the full Sound group (after the accessibility switches). */
export function SoundSettings() {
  const p = soundPrefs.value;
  return (
    <div class="stack sound-settings" role="group" aria-labelledby="sound-h">
      <h3 class="panel-title" id="sound-h">
        {t('sound.title')}
      </h3>
      <p class="px-text-muted">{t('sound.hint')}</p>
      <div>
        <SwitchRow label={t('sound.music')} hint={t('sound.music.hint')} checked={p.musicOn} onChange={(next) => setSound('musicOn', next)} />
        <Volume label={t('sound.musicVolume')} value={p.musicVolume} on={p.musicOn} onInput={(v) => setSound('musicVolume', v)} />
        <SwitchRow label={t('sound.sfx')} hint={t('sound.sfx.hint')} checked={p.sfxOn} onChange={setEffects} />
        <Volume label={t('sound.sfxVolume')} value={p.sfxVolume} on={p.sfxOn} onInput={(v) => setSound('sfxVolume', v)} onCommit={() => sfx('tap')} />
      </div>
    </div>
  );
}

/** Splash: two compact switches next to START (TALA shows them on its start gate). */
export function SoundSwitches() {
  const p = soundPrefs.value;
  const id = useId();
  return (
    <div class="sound-switches" role="group" aria-label={t('splash.sound')}>
      <label class="sound-switch">
        <span class="sound-switch__text">
          <span id={`${id}-m`}>{t('sound.music')}</span>
          <span class="sound-switch__state" aria-hidden="true">
            {p.musicOn ? t('setting.on') : t('setting.off')}
          </span>
        </span>
        <Switch checked={p.musicOn} onChange={(next) => setSound('musicOn', next)} aria-labelledby={`${id}-m`} />
      </label>
      <label class="sound-switch">
        <span class="sound-switch__text">
          <span id={`${id}-s`}>{t('sound.sfx')}</span>
          <span class="sound-switch__state" aria-hidden="true">
            {p.sfxOn ? t('setting.on') : t('setting.off')}
          </span>
        </span>
        <Switch checked={p.sfxOn} onChange={setEffects} aria-labelledby={`${id}-s`} />
      </label>
    </div>
  );
}
