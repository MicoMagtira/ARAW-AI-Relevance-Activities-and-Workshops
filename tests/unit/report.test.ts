import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_DETAILS,
  MAX_MAILTO_LENGTH,
  REPORT_EMAIL,
  REPORT_ENDPOINT,
  buildGmailUrl,
  buildMailto,
  buildReportPayload,
  buildReportText,
  cleanField,
  describeDevice,
  sendReport,
  type ReportInput,
} from '../../src/app/report';
import { t } from '../../src/app/i18n';

describe('describeDevice', () => {
  it('parses OS and browser', () => {
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe('Windows, Chrome');
    expect(describeDevice('Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')).toBe('Android, Chrome');
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1')).toBe('iOS, Safari');
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36 Edg/120')).toBe('Windows, Edge');
    expect(describeDevice('')).toBe('Unknown OS, Unknown browser');
  });
});

describe('buildMailto', () => {
  it('builds the prefilled mailto with subject and body', () => {
    const href = buildMailto({ category: 'content', screen: 'learn', item: 'm03-c2', details: 'Wrong fact & typo', device: 'Android, Chrome', version: '0.1.0 beta' });
    expect(href.startsWith(`mailto:${REPORT_EMAIL}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(params.get('subject')).toBe('[ARAW] Report: Wrong or unsafe info');
    expect(params.get('body')).toBe(
      'Screen: learn\nItem: m03-c2\nApp: ARAW 0.1.0 beta\nDevice: Android, Chrome\n\nWhat happened:\nWrong fact & typo',
    );
  });

  it('says "none" when there is no item', () => {
    const href = buildMailto({ category: 'bug', screen: 'home', details: '', device: 'x' });
    expect(decodeURIComponent(href)).toContain('Item: none');
  });
});

describe('buildMailto: safety and encoding', () => {
  const parts = (href: string) => new URLSearchParams(href.slice(href.indexOf('?') + 1));

  it('strips control characters and caps URL-supplied fields', () => {
    expect(cleanField('m03\nBcc: x@y.z')).toBe('m03 Bcc: x@y.z');
    expect(cleanField('x'.repeat(200))).toHaveLength(60);
    expect(cleanField(undefined)).toBe('');
    const href = buildMailto({ category: 'bug', screen: 'home\r\nBcc: a@b.c', item: 'i'.repeat(200), details: '', device: 'x' });
    const lines = (parts(href).get('body') ?? '').split('\n');
    expect(lines[0]).toBe('Screen: home Bcc: a@b.c');
    expect(lines[1]).toHaveLength('Item: '.length + 60);
  });

  it('percent-encodes everything so the link stays one clean URL', () => {
    const href = buildMailto({ category: 'suggestion', screen: 'me', details: 'Salamat! & more=1 #tag?', device: 'x' });
    expect(href).not.toMatch(/[ \n#]/);
    expect(parts(href).get('body')).toContain('Salamat! & more=1 #tag?');
  });

  it('trims long details so the link fits, keeping the context lines', () => {
    const href = buildMailto({ category: 'content', screen: 'learn', item: 'm03-c2', details: 'Ang ganda! '.repeat(400), device: 'Android, Chrome' });
    expect(href.length).toBeLessThanOrEqual(MAX_MAILTO_LENGTH);
    const body = parts(href).get('body') ?? '';
    expect(body).toContain('Item: m03-c2');
    expect(body.endsWith('...')).toBe(true);
  });
});

describe('t()', () => {
  it('replaces placeholders and keeps unknown ones', () => {
    expect(t('home.greeting.morning', { name: 'Bea' })).toBe('Good morning, Bea!');
    expect(t('home.greeting.morning')).toBe('Good morning, {name}!');
  });
});


const SAMPLE: ReportInput = { category: 'content', screen: 'learn', item: 'm03-c2', details: '  Wrong fact & typo  ', device: 'Android, Chrome', version: '0.1.0 beta' };

describe('buildReportPayload', () => {
  it('sends the category id, cleaned context fields, trimmed details and the honeypot', () => {
    expect(buildReportPayload(SAMPLE)).toEqual({
      category: 'content',
      screen: 'learn',
      item: 'm03-c2',
      details: 'Wrong fact & typo',
      device: 'Android, Chrome',
      version: '0.1.0 beta',
      website: '',
    });
    expect(buildReportPayload(SAMPLE, 'spam.example').website).toBe('spam.example');
  });

  it('caps long or unsafe fields to what the relay accepts', () => {
    const p = buildReportPayload({ category: 'bug', screen: 'a\nb', item: 'i'.repeat(200), details: 'x'.repeat(5000), device: '' });
    expect(p.screen).toBe('a b');
    expect(p.item).toHaveLength(60);
    expect(p.details).toHaveLength(MAX_DETAILS);
    expect(p.device).toBe('unknown');
    expect(p.version).toMatch(/beta/);
  });
});

describe('buildGmailUrl', () => {
  it('builds a Gmail compose link with to, subject and body', () => {
    const url = buildGmailUrl(SAMPLE);
    expect(url.startsWith('https://mail.google.com/mail/?view=cm&fs=1&')).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('to')).toBe(REPORT_EMAIL);
    expect(params.get('su')).toBe('[ARAW] Report: Wrong or unsafe info');
    expect(params.get('body')).toBe('Screen: learn\nItem: m03-c2\nApp: ARAW 0.1.0 beta\nDevice: Android, Chrome\n\nWhat happened:\nWrong fact & typo');
    expect(url).not.toMatch(/[\s#]/);
  });

  it('trims long details the same way as the mailto link', () => {
    const url = buildGmailUrl({ ...SAMPLE, details: 'Ang ganda! '.repeat(400) });
    expect(url.length).toBeLessThanOrEqual(MAX_MAILTO_LENGTH);
    const body = new URL(url).searchParams.get('body') ?? '';
    expect(body).toContain('Device: Android, Chrome');
    expect(body.endsWith('...')).toBe(true);
  });
});

describe('buildReportText', () => {
  it('has the address, subject and full body for pasting anywhere', () => {
    expect(buildReportText(SAMPLE)).toBe(
      `To: ${REPORT_EMAIL}\nSubject: [ARAW] Report: Wrong or unsafe info\n\nScreen: learn\nItem: m03-c2\nApp: ARAW 0.1.0 beta\nDevice: Android, Chrome\n\nWhat happened:\nWrong fact & typo`,
    );
  });

  it('is not trimmed to link length, only to the details limit', () => {
    const text = buildReportText({ ...SAMPLE, details: 'y'.repeat(3000) });
    expect(text.endsWith('y'.repeat(MAX_DETAILS))).toBe(true);
    expect(text).not.toContain('y'.repeat(MAX_DETAILS + 1));
  });
});

describe('sendReport', () => {
  const ENDPOINT = 'https://script.google.com/macros/s/test/exec';
  const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has no endpoint configured in tests', () => {
    expect(REPORT_ENDPOINT).toBe('');
  });

  it('POSTs the JSON payload as text/plain and returns sent on {ok:true}', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ ok: true }));
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl: fetchImpl as unknown as typeof fetch })).resolves.toBe('sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(ENDPOINT);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' });
    expect(JSON.parse(String(init?.body))).toEqual(buildReportPayload(SAMPLE));
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns failed on an HTTP error or an {ok:false} reply', async () => {
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl: async () => jsonResponse({ ok: true }, 500) })).resolves.toBe('failed');
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl: async () => jsonResponse({ ok: false, error: 'rate_limited' }) })).resolves.toBe('failed');
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl: async () => new Response('<html>sign in</html>') })).resolves.toBe('failed');
  });

  it('returns failed when the network call throws', async () => {
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl: async () => Promise.reject(new TypeError('Failed to fetch')) })).resolves.toBe('failed');
  });

  it('times out, aborting the request, and returns failed', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = (_url: string, init?: RequestInit): Promise<Response> => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {}); // never answers and ignores the signal
    };
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 })).resolves.toBe('failed');
    expect(signal?.aborted).toBe(true);
  });

  it('returns unavailable without an endpoint, without calling fetch', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    await expect(sendReport(SAMPLE, { endpoint: '', fetchImpl })).resolves.toBe('unavailable');
    await expect(sendReport(SAMPLE, { endpoint: '   ', fetchImpl })).resolves.toBe('unavailable');
    await expect(sendReport(SAMPLE, { fetchImpl })).resolves.toBe('unavailable');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns unavailable when the device is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    await expect(sendReport(SAMPLE, { endpoint: ENDPOINT, fetchImpl })).resolves.toBe('unavailable');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
