// Landing screen, the very first thing a session shows: "before sunrise". The player picks a language and presses Select.
// That tap is also the gesture browsers need before they play audio, so the morning theme is already playing when the
// sunrise splash (with its loading bar and START) comes next. Same sky, clouds, sun and credits as the splash, with the sun
// still below the horizon. The choice is saved and can be changed later in Me > Settings.
import { useState } from 'preact/hooks';
import { finishLanguage } from '../app/boot';
import { t } from '../app/i18n';
import { LANGUAGES, language, setLanguage, type LanguageCode } from '../app/language';
import { Ara } from '../ui/Ara';
import { Icon } from '../ui/Icon';
import { LanguagePicker } from '../ui/LanguagePicker';
import { Button } from '../ui/kit';
import { Cloud, SplashPartners, Sun } from './Splash';

export function Landing() {
  // a returning player sees their saved language already picked; a first visit starts with none
  const [choice, setChoice] = useState<LanguageCode | null>(language.value);

  const select = (): void => {
    if (!choice) return;
    // the pack loads, then the splash comes up already in the chosen language
    void setLanguage(choice, false).then(finishLanguage);
  };

  return (
    <main class="splash landing" id="landing" aria-labelledby="landing-title">
      <div class="splash__sky">
        <Cloud class="splash__cloud--a" />
        <Cloud class="splash__cloud--b" />
        <div class="px-box splash__title landing__panel">
          <h1 class="splash__wordmark" id="landing-title">
            {t('app.name')}
          </h1>
          <p class="splash__tagline">{t('app.tagline')}</p>
          <h2 class="landing__prompt" id="landing-prompt">
            {t('lang.title')}
          </h2>
          {LANGUAGES.length > 1 && (
            <p class="landing__prompts">
              {LANGUAGES.filter((l) => l.code !== 'en').map((l) => (
                <span key={l.code} lang={l.code}>
                  {l.prompt}
                </span>
              ))}
            </p>
          )}
          <LanguagePicker value={choice} onPick={setChoice} label={t('lang.title')} hideLabel class="landing__picker" />
          <Button large variant="gold" class="landing__select" disabled={!choice} data-sfx="open" onClick={select}>
            {t('lang.select')}
            <Icon name="play" />
          </Button>
          <p class="landing__later">{t('lang.later')}</p>
          <SplashPartners />
        </div>
        <div class="splash__scene landing__scene" aria-hidden="true">
          <Sun />
          <Ara mood="happy" scale={4} decorative class="splash__ara" />
        </div>
      </div>

      <div class="splash__ground landing__ground">
        <p class="splash__credit">{t('app.createdBy')}</p>
      </div>
    </main>
  );
}
