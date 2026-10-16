// Stand-alone preview of the Guide screen before it is routed in the app (layout checks only, see check-layout.mjs).
import { render } from 'preact';
import '../../../src/styles/tokens.css';
import '../../../src/styles/base.css';
import '../../../src/styles/shell.css';
import '../../../src/styles/screens.css';
import Guide from '../../../src/screens/guide/Guide';
import './preview.css';

const root = document.getElementById('app');
if (root)
  render(
    <div class="pv">
      <aside class="pv-side" aria-hidden="true" />
      <div class="pv-col">
        <header class="pv-banner banner">
          <h1 class="banner__title">GUIDE</h1>
        </header>
        <main class="content screen" id="main">
          <Guide />
        </main>
      </div>
    </div>,
    root,
  );
