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
import { App } from './app/App';
import { initBoot } from './app/boot';
import { location$, startRouter } from './app/router';
import { initSettings } from './app/settings';

initSettings();
startRouter();
initBoot(location$.value.path);

const root = document.getElementById('app');
if (root) render(<App />, root);
