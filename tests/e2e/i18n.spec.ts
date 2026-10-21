// Every language that has a pack (src/i18n/packs/<code>.json) gets a sweep of the main screens: the page is in that
// language, nothing scrolls sideways (translations run longer than English), and untranslated English is listed.
import { readdirSync, writeFileSync } from 'node:fs';
import { expect, noHorizontalOverflow, test } from './fixtures';

const CODES = (() => {
  try {
    return readdirSync('src/i18n/packs').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
})();

const SCREENS = ['/', '/learn', '/learn/m01', '/play/fact-or-fake', '/arcade', '/daily', '/sandbox', '/library', '/library/glossary', '/me', '/report', '/guide'];

test.describe('language packs', () => {
  test.skip(CODES.length === 0, 'no language packs in this build');

  for (const code of CODES) {
    test(`${code}: main screens are translated and fit`, async ({ page }, info) => {
      test.setTimeout(120_000);
      await page.addInitScript((c) => localStorage.setItem('araw:v1:language', JSON.stringify(c)), code);
      const missing = new Set<string>();
      for (const path of SCREENS) {
        await page.goto(`/?i18n-missing#${path}`);
        await page.locator('#main').waitFor();
        await expect(page.locator('html')).toHaveAttribute('lang', code);
        await noHorizontalOverflow(page);
        for (const s of await page.evaluate(() => [...((window as unknown as { __arawMissing?: Set<string> }).__arawMissing ?? [])])) missing.add(s);
      }
      // the bottom/side navigation must be in the language (Learn is translated in every pack)
      await expect(page.getByRole('navigation', { name: /./ }).first()).not.toContainText(/^Home\s*Learn/);
      if (info.project.name === 'desktop') {
        writeFileSync(`scripts/i18n/work/${code}/missing.txt`, [...missing].sort().join('\n') + '\n');
        console.log(`${code}: ${missing.size} untranslated strings seen on ${SCREENS.length} screens (scripts/i18n/work/${code}/missing.txt)`);
      }
    });
  }
});
