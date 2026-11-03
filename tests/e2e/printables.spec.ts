import AxeBuilder from '@axe-core/playwright';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('Library: Printables tab', () => {
  test('lists the public print kit with real download links, and no facilitator sheet', async ({ page }) => {
    await page.goto('/#/library');
    await page.getByRole('tab', { name: 'Printables' }).click();
    await expect(page).toHaveURL(/#\/library\/printables$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Printable kit' })).toBeVisible();

    const cards = page.locator('.printables__card');
    await expect(cards).toHaveCount(10);
    await expect(page.getByRole('heading', { level: 3, name: 'When should I trust it?' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Myth cards' })).toBeVisible();
    await expect(page.getByText(/answer key|pre-test|post-test/i)).toHaveCount(0);

    const link = page.getByRole('link', { name: 'Download Myth cards as a PDF' });
    await expect(link).toHaveAttribute('href', 'print/en/myth-cards.pdf');
    await expect(link).toHaveAttribute('download', 'ARAW-myth-cards-en.pdf');
    // 44 px tap targets
    for (const el of await page.locator('.printables a, .printables__lang').all()) {
      const b = await el.boundingBox();
      expect(b?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    // the file really exists on the server
    const res = await page.request.get(new URL('print/en/myth-cards.pdf', page.url()).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
    await noHorizontalOverflow(page);
  });

  test('the language picker switches the links, and starts in the app language', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('araw:v1:language', JSON.stringify('ilo')));
    await page.goto('/#/library/printables');
    const picker = page.getByRole('group', { name: /Language of the sheets|Pagsasao/ });
    await expect(picker.getByRole('button', { name: 'Ilokano' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.printables__card a').first()).toHaveAttribute('href', 'print/ilo/trust-guide.pdf');

    await picker.getByRole('button', { name: 'Cebuano' }).click();
    await expect(picker.getByRole('button', { name: 'Cebuano' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.printables__card a').first()).toHaveAttribute('href', 'print/ceb/trust-guide.pdf');
    for (const href of await page.locator('.printables__card a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^print\/ceb\/[a-z-]+\.pdf$/);
    }
    await noHorizontalOverflow(page);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await page.goto('/#/library/printables');
    await expect(page.locator('.printables__card')).toHaveCount(10);
    await page.waitForFunction(() => document.querySelector('.screen')?.getAnimations().every((a) => a.playState === 'finished') ?? false);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
    expect(bad).toEqual([]);
  });
});
