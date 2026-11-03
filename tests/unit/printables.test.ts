import { afterEach, describe, expect, it } from 'vitest';
import manifestJson from '../../src/content/printManifest.json';
import { FACILITATOR_ONLY, SHEET_ORDER, defaultPrintLang, formatBytes, printHref, printLangs, printSheets, setPrintManifest, type PrintEntry } from '../../src/app/printables';
import { parseTab } from '../../src/app/library';

const real = (manifestJson as { entries: PrintEntry[] }).entries;
afterEach(() => setPrintManifest(real));

const e = (id: string, lang: string, pages = 1, bytes = 2048): PrintEntry => ({ id, lang, pages, bytes });

describe('print manifest helpers', () => {
  it('lists sheets in display order, one row per sheet, with a relative download path', () => {
    setPrintManifest([e('certificate', 'en'), e('myth-cards', 'en', 22), e('trust-guide', 'en'), e('trust-guide', 'fil')]);
    const rows = printSheets('en');
    expect(rows.map((r) => r.id)).toEqual(['trust-guide', 'myth-cards', 'certificate']);
    expect(rows[1]).toMatchObject({ pages: 22, lang: 'en', href: 'print/en/myth-cards.pdf' });
    expect(printHref('trust-guide', 'ilo')).toBe('print/ilo/trust-guide.pdf');
  });

  it('uses the chosen language, and falls back to English for a sheet that language lacks', () => {
    setPrintManifest([e('trust-guide', 'en'), e('trust-guide', 'fil'), e('glossary', 'en')]);
    const rows = printSheets('fil');
    expect(rows.find((r) => r.id === 'trust-guide')?.lang).toBe('fil');
    expect(rows.find((r) => r.id === 'glossary')).toMatchObject({ lang: 'en', href: 'print/en/glossary.pdf' });
  });

  it('never lists facilitator-only sheets, even if they are in the manifest', () => {
    setPrintManifest([...[...FACILITATOR_ONLY].map((id) => e(id, 'en')), e('trust-guide', 'en')]);
    expect(printSheets('en').map((r) => r.id)).toEqual(['trust-guide']);
    expect(printLangs()).toEqual(['en']);
    setPrintManifest([...[...FACILITATOR_ONLY].map((id) => e(id, 'fil'))]);
    expect(printSheets('fil')).toEqual([]);
    expect(printLangs()).toEqual([]);
    expect(defaultPrintLang('fil')).toBeNull();
  });

  it('defaults to the app language when sheets exist in it, else English, else the first language', () => {
    setPrintManifest([e('trust-guide', 'en'), e('trust-guide', 'ilo')]);
    expect(printLangs()).toEqual(['en', 'ilo']);
    expect(defaultPrintLang('ilo')).toBe('ilo');
    expect(defaultPrintLang('hil')).toBe('en');
    expect(defaultPrintLang(null)).toBe('en');
    setPrintManifest([e('trust-guide', 'ceb')]);
    expect(defaultPrintLang('hil')).toBe('ceb');
  });

  it('formats sizes in KB or MB', () => {
    expect(formatBytes(531 * 1024)).toBe('531 KB');
    expect(formatBytes(100)).toBe('1 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('the shipped manifest has every public sheet in all five languages and no facilitator sheet', () => {
    expect(real.some((x) => FACILITATOR_ONLY.has(x.id))).toBe(false);
    for (const lang of ['en', 'fil', 'ceb', 'ilo', 'hil']) expect(printSheets(lang).map((r) => r.id)).toEqual([...SHEET_ORDER]);
    for (const x of real) expect(x.bytes).toBeLessThan(2 * 1024 * 1024);
  });

  it('is a Library tab route', () => {
    expect(parseTab('printables')).toBe('printables');
  });
});
