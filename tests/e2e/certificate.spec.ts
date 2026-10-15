import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

const ALL_MODULES = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'];
const seed = (page: Page, key: string, value: unknown) =>
  page.addInitScript(([k, v]) => window.localStorage.setItem(`araw:v1:${k}`, JSON.stringify(v)), [key, value] as const);

test.describe('Me: badge cabinet and certificate', () => {
  test('groups all 20 badges, locked ones show how to earn them', async ({ page }) => {
    await seed(page, 'badges', ['module-m01', 'streak-3']);
    await page.goto('/#/me');
    for (const name of ['Module badges', 'Villain badges', 'Truth Radar', 'Streak badges', 'Finale']) {
      await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
    }
    await expect(page.locator('.badge-pick')).toHaveCount(20);
    await page.getByRole('button', { name: /Isang Linggo/ }).click();
    await expect(page.locator('.badge-info')).toContainText('Learn or play on 7 days in a row');
    await page.getByRole('button', { name: /Tatlong Araw/ }).click();
    await expect(page.locator('.badge-info')).toContainText('Earned');
    // the certificate is locked until all 10 modules are done
    await expect(page.getByText('Locked: 0 of 10 modules done')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get my certificate' })).toHaveCount(0);
    await noHorizontalOverflow(page);
  });

  test('the certificate page is locked until all 10 modules are done', async ({ page }) => {
    await seed(page, 'modulesDone', ['m01', 'm02']);
    await page.goto('/#/certificate');
    await expect(page.getByRole('heading', { level: 2, name: 'Your certificate is waiting' })).toBeVisible();
    await expect(page.getByText('You have done 2 of 10.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Learn' })).toHaveAttribute('href', '#/learn');
    await noHorizontalOverflow(page);
  });

  test('type a name, preview, download a PNG and print; the name is not stored', async ({ page }) => {
    await seed(page, 'modulesDone', ALL_MODULES);
    await seed(page, 'badges', ['module-m01', 'finale']);
    await page.goto('/#/me');
    await page.getByRole('link', { name: 'Get my certificate' }).click();
    await expect(page).toHaveURL(/#\/certificate$/);
    // focus mode: no sidebar or tab bar
    await expect(page.locator('.sidebar')).toHaveCount(0);

    const print = page.getByRole('button', { name: 'Print' });
    const download = page.getByRole('button', { name: 'Download PNG' });
    await expect(print).toBeDisabled();
    await expect(download).toBeDisabled();
    await expect(page.getByText('Type your name to print or download.')).toBeVisible();

    await page.getByLabel('Your name', { exact: true }).fill('Maria Santos');
    await expect(print).toBeEnabled();
    const canvas = page.getByRole('img', { name: /^Certificate\. Maria Santos completed all 10 ARAW modules on .+\. Badges earned: 2 of 20\./ });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('aria-label', /An AIKasalig project, DOST-PCHRD, National University\. Educational, not medical advice\./);

    // the canvas has real drawing in it (not blank) and is A4 landscape
    const stats = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const data = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? new Uint8ClampedArray();
      const colours = new Set<number>();
      for (let i = 0; i < data.length; i += 4 * 997) colours.add(((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0));
      return { w: c.width, h: c.height, colours: colours.size };
    });
    expect(stats.w / stats.h).toBeCloseTo(297 / 210, 2);
    expect(stats.colours).toBeGreaterThan(4);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
    expect(file.suggestedFilename()).toBe('ARAW-certificate.png');
    await expect(page.getByText('Your picture was saved to your downloads.')).toBeVisible();

    // print: only the certificate stays on the page, A4 landscape
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.cert-controls')).toBeHidden();
    await expect(page.locator('.cert-frame .lesson-bar')).toBeHidden();
    const box = await page.locator('.cert-print').boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(900); // 297mm at 96 dpi is about 1123px
    expect(Math.abs((box?.width ?? 1) / (box?.height ?? 1) - 297 / 210)).toBeLessThan(0.01);
    await page.emulateMedia({ media: 'screen' });

    // the name was never stored anywhere
    const everything = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + location.href);
    expect(everything).not.toContain('Maria');
    expect(everything).not.toContain('Santos');
  });
});
