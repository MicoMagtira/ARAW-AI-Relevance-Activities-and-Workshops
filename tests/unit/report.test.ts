import { describe, expect, it } from 'vitest';
import { MAX_MAILTO_LENGTH, REPORT_EMAIL, buildMailto, cleanField, describeDevice } from '../../src/app/report';
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
    expect(t('home.greeting.morning', { name: 'Bea' })).toBe('Magandang umaga, Bea!');
    expect(t('home.greeting.morning')).toBe('Magandang umaga, {name}!');
  });
});
