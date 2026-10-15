import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import { Shell } from './app/Shell';
import { startRouter } from './app/router';
import { initSettings } from './app/settings';

initSettings();
startRouter();

const root = document.getElementById('app');
if (root) render(<Shell />, root);
