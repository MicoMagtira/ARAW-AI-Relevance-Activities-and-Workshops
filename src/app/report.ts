import { t } from './i18n';

export const REPORT_EMAIL = 'AIKasalig@gmail.com';
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0 beta';

/**
 * Google Apps Script web app (/exec URL) that emails reports to REPORT_EMAIL (tools/report-relay).
 * Set VITE_REPORT_ENDPOINT at build time; empty means the in-app Send button is hidden and only the fallbacks show.
 */
export const REPORT_ENDPOINT: string = typeof import.meta.env.VITE_REPORT_ENDPOINT === 'string' ? import.meta.env.VITE_REPORT_ENDPOINT.trim() : '';

export const REPORT_CATEGORIES = [
  { id: 'bug', labelKey: 'report.cat.bug' },
  { id: 'content', labelKey: 'report.cat.content' },
  { id: 'suggestion', labelKey: 'report.cat.suggestion' },
  { id: 'other', labelKey: 'report.cat.other' },
] as const;

export type ReportCategoryId = (typeof REPORT_CATEGORIES)[number]['id'];

/** Short "<OS>, <browser>" summary parsed from a user agent string. */
export function describeDevice(ua: string): string {
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /CrOS/i.test(ua)
            ? 'ChromeOS'
            : /Linux/i.test(ua)
              ? 'Linux'
              : 'Unknown OS';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Unknown browser';
  return `${os}, ${browser}`;
}

export interface ReportInput {
  category: ReportCategoryId;
  screen: string;
  item?: string;
  details: string;
  device: string;
  version?: string;
}

/** Longest mailto: / Gmail link we build; some mail clients and browsers drop longer ones. */
export const MAX_MAILTO_LENGTH = 1900;
/** Longest player text we accept (the textarea limit and the relay's limit). */
export const MAX_DETAILS = 1500;
const MAX_FIELD = 60;

/** Query values come from the URL, so keep them short and free of control characters. */
export function cleanField(value: string | undefined): string {
  return (value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_FIELD);
}

const categoryOf = (id: ReportCategoryId) => REPORT_CATEGORIES.find((c) => c.id === id) ?? REPORT_CATEGORIES[3];

/** Email subject used by the mailto and Gmail fallbacks. */
export function reportSubject(input: Pick<ReportInput, 'category'>): string {
  return `[ARAW] Report: ${t(categoryOf(input.category).labelKey)}`;
}

/** Plain-text email body: context lines first, then the player's text. */
function reportBody(input: ReportInput, details: string): string {
  return [
    `Screen: ${cleanField(input.screen) || 'unknown'}`,
    `Item: ${cleanField(input.item) || 'none'}`,
    `App: ARAW ${input.version ?? APP_VERSION}`,
    `Device: ${cleanField(input.device) || 'unknown'}`,
    '',
    'What happened:',
    details,
  ].join('\n');
}

/** Trim the player's text (never the context lines) until the built link fits MAX_MAILTO_LENGTH. */
function fitLink(input: ReportInput, make: (body: string) => string): string {
  let details = input.details.trim().slice(0, MAX_DETAILS);
  let href = make(reportBody(input, details));
  while (href.length > MAX_MAILTO_LENGTH && details.length > 0) {
    details = details.slice(0, Math.max(0, details.length - Math.max(10, Math.ceil((href.length - MAX_MAILTO_LENGTH) / 3))));
    href = make(reportBody(input, `${details.trimEnd()}...`));
  }
  return href;
}

/** Build the mailto: link. Nothing is sent until the player presses Send in their email app. */
export function buildMailto(input: ReportInput): string {
  const subject = encodeURIComponent(reportSubject(input));
  return fitLink(input, (body) => `mailto:${REPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`);
}

/** Gmail web compose link (works without a mail app when the player uses Gmail in the browser). */
export function buildGmailUrl(input: ReportInput): string {
  const head = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(REPORT_EMAIL)}&su=${encodeURIComponent(reportSubject(input))}`;
  return fitLink(input, (body) => `${head}&body=${encodeURIComponent(body)}`);
}

/** The whole report as text to copy and paste into any email or chat (not trimmed for URL length). */
export function buildReportText(input: ReportInput): string {
  return [`To: ${REPORT_EMAIL}`, `Subject: ${reportSubject(input)}`, '', reportBody(input, input.details.trim().slice(0, MAX_DETAILS))].join('\n');
}

/** JSON body the relay (tools/report-relay/Code.gs) expects. */
export interface ReportPayload {
  category: ReportCategoryId;
  screen: string;
  item: string;
  details: string;
  device: string;
  version: string;
  /** Honeypot: people never see this field, so anything in it means a bot filled the form. */
  website: string;
}

export function buildReportPayload(input: ReportInput, honeypot = ''): ReportPayload {
  return {
    category: categoryOf(input.category).id,
    screen: cleanField(input.screen) || 'unknown',
    item: cleanField(input.item),
    details: input.details.trim().slice(0, MAX_DETAILS),
    device: cleanField(input.device) || 'unknown',
    version: cleanField(input.version ?? APP_VERSION),
    website: honeypot,
  };
}

export type SendResult = 'sent' | 'failed' | 'unavailable';

export interface SendOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Defaults to REPORT_ENDPOINT (tests pass their own). */
  endpoint?: string;
  honeypot?: string;
}

/**
 * POST the report to the relay. JSON goes as text/plain so the browser makes a "simple" request with no CORS preflight
 * (Apps Script cannot answer one). 'unavailable' = no endpoint configured or the device is offline.
 */
export async function sendReport(input: ReportInput, options: SendOptions = {}): Promise<SendResult> {
  const endpoint = (options.endpoint ?? REPORT_ENDPOINT).trim();
  if (!endpoint) return 'unavailable';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'unavailable';
  const fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!fetchImpl) return 'unavailable';

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Reject on timeout even if a fetch ignores the abort signal.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, options.timeoutMs ?? 10_000);
  });
  const request = async (): Promise<SendResult> => {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(buildReportPayload(input, options.honeypot)),
      signal: controller.signal,
      redirect: 'follow',
      credentials: 'omit',
    });
    if (!res.ok) return 'failed';
    const data: unknown = await res.json();
    return typeof data === 'object' && data !== null && (data as { ok?: unknown }).ok === true ? 'sent' : 'failed';
  };
  try {
    return await Promise.race([request(), timeout]);
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}
