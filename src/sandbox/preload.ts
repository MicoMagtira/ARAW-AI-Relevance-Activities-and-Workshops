// Quiet background download of the Chatbot Sandbox model, so it is usually ready by the time a learner opens the sandbox
// (docs/DECISIONS-LOG.md, SANDBOX-PRELOAD). Only on Wi-Fi or another unmetered link: Android Chrome reports the
// connection type and Data Saver; iPhones and desktops do not, so they download too. Mobile data and Data Saver wait
// until the sandbox is opened. The file is only saved on the device, never loaded into memory here. This module is part
// of the first load, so it stays tiny: the engine itself is imported only when the download starts.

interface NetworkInfo {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
}

const METERED = new Set(['cellular', 'bluetooth', 'wimax', 'none']);

/** Whether a background download is welcome on this connection. Automated browsers (tests) never download. */
export function okToPrefetch(connection: NetworkInfo | undefined, automated: boolean): boolean {
  if (automated) return false;
  if (!connection) return true;
  if (connection.saveData) return false;
  if (connection.type && METERED.has(connection.type)) return false;
  if (connection.effectiveType && /2g/.test(connection.effectiveType)) return false;
  return true;
}

/** Start the background download a little after the app has loaded, when the browser is idle. */
export function schedulePrefetch(delayMs = 8000): void {
  if (typeof window === 'undefined') return;
  const nav = navigator as Navigator & { connection?: NetworkInfo };
  if (!okToPrefetch(nav.connection, nav.webdriver === true || !!window.__ARAW_FAKE_LLM__)) return;
  const start = () => {
    void Promise.all([import('./engine'), import('./model')])
      .then(([{ getEngine }, { pickModel }]) => getEngine(pickModel()).prefetch())
      .catch(() => {
        /* quiet: the sandbox downloads it when opened */
      });
  };
  setTimeout(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 10_000 });
    else start();
  }, delayMs);
}
