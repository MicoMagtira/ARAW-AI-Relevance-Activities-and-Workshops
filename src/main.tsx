import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/screens.css';
import './styles/learn.css';
import './styles/library.css';
import './styles/lesson.css';
import './styles/fof.css';
import './styles/ara.css';
import './styles/splash.css';
import './styles/brand.css';
import { App } from './app/App';
import { initBoot } from './app/boot';
import { registerServiceWorker } from './app/pwa';
import { location$, startRouter } from './app/router';
import { initLanguage, language } from './app/language';
import { installTranslation } from './i18n/dom';
import { loadPack, packVersion } from './i18n/runtime';
import { initSettings } from './app/settings';
import { initSound } from './app/sound';
import { startAutoFit } from './ui/autoFit';
import { initMusic } from './app/sound/music';
import { schedulePrefetch } from './sandbox/preload';

installTranslation();
initSettings();
initLanguage();
initSound();
startAutoFit();
startRouter();
initMusic();
initBoot(location$.value.path);

/** Remounts the app whenever the language pack changes, so every screen re-renders in the new language. */
function Root() {
  return <App key={packVersion.value} />;
}

const root = document.getElementById('app');
// the saved language's pack loads first (English needs none), so the first paint is already in the right language
void loadPack(language.value, false).finally(() => {
  if (root) render(<Root />, root);
});
registerServiceWorker();
schedulePrefetch(); // Chatbot Sandbox model, quietly in the background on Wi-Fi (src/sandbox/preload.ts)
