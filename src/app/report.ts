import { t } from './i18n';

export const REPORT_EMAIL = 'AIKasalig@gmail.com';
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0 beta';

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

/** Longest mailto: link we build; some mail clients and browsers drop longer ones. */
export const MAX_MAILTO_LENGTH = 1900;
const MAX_FIELD = 60;

/** Query values come from the URL, so keep them short and free of control characters. */
export function cleanField(value: string | undefined): string {
  return (value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_FIELD);
}

/** Build the mailto: link. Nothing is sent until the player presses Send in their email app. */
export function buildMailto(input: ReportInput): string {
  const cat = REPORT_CATEGORIES.find((c) => c.id === input.category) ?? REPORT_CATEGORIES[3];
  const subject = `[ARAW] Report: ${t(cat.labelKey)}`;
  const make = (details: string): string => {
    const body = [
      `Screen: ${cleanField(input.screen) || 'unknown'}`,
      `Item: ${cleanField(input.item) || 'none'}`,
      `App: ARAW ${input.version ?? APP_VERSION}`,
      `Device: ${cleanField(input.device) || 'unknown'}`,
      '',
      'What happened:',
      details,
    ].join('\n');
    return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  let details = input.details.trim();
  let href = make(details);
  // Trim the player's text (never the context lines) until the link fits.
  while (href.length > MAX_MAILTO_LENGTH && details.length > 0) {
    details = details.slice(0, Math.max(0, details.length - Math.max(10, Math.ceil((href.length - MAX_MAILTO_LENGTH) / 3))));
    href = make(`${details.trimEnd()}...`);
  }
  return href;
}
