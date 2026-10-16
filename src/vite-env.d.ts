/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json, e.g. "0.1.0 beta". */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Report relay (Google Apps Script web app /exec URL). Optional; see tools/report-relay/README.md. */
  readonly VITE_REPORT_ENDPOINT?: string;
}
