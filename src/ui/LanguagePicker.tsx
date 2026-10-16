// Language cards (a native radio group): the landing screen's first choice and the Language setting on Me.
// Picking a card plays the "select" blip; the landing screen confirms with its Select button, Me saves at once.
import { useId } from 'preact/hooks';
import { t } from '../app/i18n';
import { LANGUAGES, type LanguageCode } from '../app/language';
import { sfx } from '../app/sound';

interface Props {
  value: LanguageCode | null;
  onPick: (code: LanguageCode) => void;
  /** Visible group label (the landing screen shows its own heading instead, so it keeps this screen-reader only). */
  label?: string;
  hideLabel?: boolean;
  class?: string;
}

export function LanguagePicker({ value, onPick, label = t('lang.group'), hideLabel = false, class: className = '' }: Props) {
  const name = useId();
  return (
    <fieldset class={`lang-picker ${className}`}>
      <legend class={hideLabel ? 'sr-only' : 'lang-picker__legend px-label'}>{label}</legend>
      <div class="lang-picker__options">
        {LANGUAGES.map((lang) => {
          const on = value === lang.code;
          return (
            <label key={lang.code} class={`lang-option${on ? ' is-on' : ''}`}>
              <input
                class="lang-option__input"
                type="radio"
                name={name}
                value={lang.code}
                checked={on}
                onChange={() => {
                  sfx('select');
                  onPick(lang.code);
                }}
              />
              <span class="lang-option__tag" aria-hidden="true">
                {lang.tag}
              </span>
              <span class="lang-option__name">{lang.name}</span>
              <span class="lang-option__mark" aria-hidden="true" />
            </label>
          );
        })}
      </div>
      <p class="lang-picker__more px-text-muted">{t('lang.more')}</p>
    </fieldset>
  );
}
