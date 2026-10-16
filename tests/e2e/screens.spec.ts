import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function settled(page: Page) {
  await page.waitForFunction(() => document.querySelector('.screen')?.getAnimations().every((a) => a.playState === 'finished') ?? false);
}

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

async function turnEverythingOn(page: Page) {
  await page.goto('/#/me');
  for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
    await page.getByRole('switch', { name }).click();
  }
}

test.describe('Home', () => {
  test('greets by time of day with the nickname and shows every card', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-15T09:00:00'));
    await page.goto('/#/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
    await expect(page.getByRole('heading', { level: 2, name: 'Good morning, Friend!' })).toBeVisible();
    await expect(page.locator('.home-hero .ara')).toBeVisible();

    // Continue card: next module + progress
    await expect(page.getByText('Continue · Module 1 of 10')).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'What Is AI, Really?' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson cards' })).toHaveAttribute('aria-valuetext', '0 / 9 cards');
    await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible();

    // Daily challenge, myth of the day, arcade shortcut, path and badges
    await expect(page.getByRole('heading', { level: 3, name: /Daily challenge · OCT 15/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play today’s challenge' })).toHaveAttribute('href', '#/daily');
    await expect(page.getByRole('link', { name: 'Open the Arcade' })).toHaveAttribute('href', '#/arcade');
    await expect(page.getByText('6 of 11 ready')).toBeVisible();
    await expect(page.getByRole('list').filter({ has: page.locator('.path-node') }).getByRole('listitem')).toHaveCount(10);
    await expect(page.locator('.path-node--current')).toHaveCount(1);
    await expect(page.locator('.path-node--locked')).toHaveCount(9);
    await expect(page.getByRole('heading', { level: 3, name: 'Your badges' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See all badges' })).toHaveAttribute('href', '#/me');
    await noHorizontalOverflow(page);

    // the path strip never hides nodes behind sideways scrolling, and the card id is not shown on lesson cards
    const strip = await page.locator('.home-path .path').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(strip).toBeLessThanOrEqual(0);
    await expect(page.locator('.lesson-id')).toHaveCount(0);
  });

  test('greeting follows the clock and the nickname', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-15T19:30:00'));
    await page.goto('/#/me');
    await page.getByLabel('Nickname').fill('Bea');
    await page.goto('/#/');
    await expect(page.getByRole('heading', { level: 2, name: 'Good evening, Bea!' })).toBeVisible();
  });

  test('myth card flips between the myth and the fact', async ({ page }) => {
    await page.goto('/#/');
    const card = page.getByRole('button', { name: /Myth of the day/ });
    await expect(card).toHaveAttribute('aria-pressed', 'false');
    await expect(card.getByText('Flip the card to see the fact')).toBeVisible();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByText('Fact', { exact: true })).toBeVisible();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  test('path nodes lead to Learn and tap targets are large enough', async ({ page }) => {
    await page.goto('/#/');
    const node = page.locator('.path-node').first();
    await node.scrollIntoViewIfNeeded();
    const box = await node.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    await node.click();
    await expect(page).toHaveURL(/#\/learn$/);
  });

  test('no horizontal overflow and no serious a11y violations, also with every setting on', async ({ page }) => {
    await page.goto('/#/');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await turnEverythingOn(page);
    await page.goto('/#/');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });
});

test.describe('Me', () => {
  test('nickname and avatar persist across reloads and show in the header', async ({ page }) => {
    await page.goto('/#/me');
    await page.getByLabel('Nickname').fill('Lola Bea');
    const picker = page.getByRole('group', { name: 'Pick your avatar' });
    expect(await picker.getByRole('button').count()).toBeGreaterThanOrEqual(6);
    for (const label of ['Grandmother with a bun and glasses', 'Woman in a hijab', 'Teen who uses a wheelchair']) {
      await expect(picker.getByRole('button', { name: new RegExp(label) })).toBeVisible();
    }
    await picker.getByRole('button', { name: 'Teen who uses a wheelchair' }).click();
    await expect(picker.getByRole('button', { name: 'Teen who uses a wheelchair' })).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.getByLabel('Nickname')).toHaveValue('Lola Bea');
    await expect(picker.getByRole('button', { name: 'Teen who uses a wheelchair' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('img', { name: /Your avatar: Teen who uses a wheelchair/ })).toBeVisible();
    if (await page.locator('.avatar-link').isVisible()) await expect(page.locator('.avatar-link__name')).toHaveText('Lola Bea');
    for (const button of await picker.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('sound controls (TALA-style) start on at 25 and 65, persist after a reload and fit', async ({ page }) => {
    await page.goto('/#/me');
    const group = page.getByRole('group', { name: 'Sound' });
    const music = group.getByRole('switch', { name: 'Music' });
    const effects = group.getByRole('switch', { name: 'Sound effects' });
    const musicVol = group.getByRole('slider', { name: 'Music volume' });
    const fxVol = group.getByRole('slider', { name: 'Sound effects volume' });
    await expect(music).toHaveAttribute('aria-checked', 'true');
    await expect(effects).toHaveAttribute('aria-checked', 'true');
    await expect(musicVol).toHaveValue('25');
    await expect(fxVol).toHaveValue('65');
    await expect(group.locator('.volume-row__value').first()).toHaveText('25');

    await musicVol.fill('60');
    await music.click();
    await expect(music).toHaveAttribute('aria-checked', 'false');
    await expect(musicVol).toBeDisabled();
    await expect(fxVol).toBeEnabled();

    await page.reload();
    await expect(group.getByRole('switch', { name: 'Music' })).toHaveAttribute('aria-checked', 'false');
    await expect(musicVol).toHaveValue('60');
    await expect(musicVol).toBeDisabled();
    await expect(effects).toHaveAttribute('aria-checked', 'true');
    for (const control of [music, effects, musicVol, fxVol]) {
      const box = await control.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
    await noHorizontalOverflow(page);
  });

  test('shows stats, badge cabinet, language row and links', async ({ page }) => {
    await page.goto('/#/me');
    for (const label of ['Total XP', 'Current streak', 'Best streak', 'Modules done', 'Badges', 'Best Truth Radar']) {
      await expect(page.locator('.stat-list dt', { hasText: label })).toBeVisible();
    }
    await page.getByRole('button', { name: /AI's Teacher/ }).click();
    await expect(page.getByText('Locked: Finish Module 2: How AI Learns and Makes Mistakes')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Language' }).getByRole('radio', { name: 'English' })).toBeChecked();
    await expect(page.getByRole('link', { name: 'Report a problem' }).last()).toHaveAttribute('href', '#/report?screen=me');
    await page.getByRole('link', { name: /About and licences/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
    await expect(page.getByText('Code: MIT licence')).toBeVisible();
    await expect(page.getByText(/CC BY 4\.0/).first()).toBeVisible();
  });

  test('every setting is off by default and each one changes the app', async ({ page }) => {
    await page.goto('/#/me');
    const html = page.locator('html');
    const bodySize = () => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const buttonHeight = () => page.evaluate(() => document.querySelector('.menu-list ~ div .px-btn, .me-settings .px-btn')?.getBoundingClientRect().height ?? 0);
    const sw = (name: string) => page.getByRole('switch', { name });

    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await expect(sw(name)).toHaveAttribute('aria-checked', 'false');
    }
    const size0 = await bodySize();
    const bg0 = await bodyBg();
    const h0 = await buttonHeight();
    expect(size0).toBe(18);
    expect(await page.locator('.sr-hint').count()).toBe(0);

    // Larger text: type scales by about 1.2
    await sw('Larger text').click();
    expect(await bodySize()).toBeGreaterThanOrEqual(size0 * 1.15);
    expect(await bodySize()).toBeLessThanOrEqual(size0 * 1.25);

    // High contrast: pure white page
    await sw('High contrast').click();
    expect(bg0).not.toBe('rgb(255, 255, 255)');
    expect(await bodyBg()).toBe('rgb(255, 255, 255)');

    // Extra-large buttons: buttons grow to at least 56px
    await sw('Extra-large buttons').click();
    expect(await buttonHeight()).toBeGreaterThanOrEqual(Math.max(56, h0));

    // Screen-reader hints: extra descriptions appear and are wired with aria-describedby
    await sw('Screen-reader hints').click();
    await expect(html).toHaveClass(/a11y-sr-hints/);
    expect(await page.locator('.sr-hint').count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Learn' })).toHaveAccessibleDescription('Ten short modules');

    // Reduce motion: animations collapse
    await sw('Reduce motion').click();
    await page.goto('/#/');
    const duration = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.screen') as Element).animationDuration));
    expect(duration).toBeLessThan(0.001);

    // all five survive a reload
    await page.reload();
    await expect(html).toHaveClass(/a11y-large-text.*|a11y-/);
    for (const cls of ['a11y-large-text', 'a11y-high-contrast', 'a11y-xl-buttons', 'a11y-sr-hints', 'a11y-reduce-motion']) {
      await expect(html).toHaveClass(new RegExp(cls));
    }
  });

  test('no horizontal overflow and no serious a11y violations, also with every setting on', async ({ page }) => {
    await page.goto('/#/me');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await turnEverythingOn(page);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });
});

test.describe('Report', () => {
  test('builds the report from category, screen, item, version, device and details, with fallbacks to send it', async ({ page }) => {
    // Tests build without VITE_REPORT_ENDPOINT, so the fallback path is expected. If a build does have one, the relay call
    // is blocked here and the failure message must lead to the same fallbacks.
    await page.route('https://script.google.com/**', (route) => route.abort());
    await page.goto('/#/report?screen=fact-or-fake&item=m03-c2');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Report');
    await expect(page.locator('.preview-list dd').nth(0)).toHaveText('fact-or-fake');
    await expect(page.locator('.preview-list dd').nth(1)).toHaveText('m03-c2');
    await expect(page.locator('.preview-list dd').nth(2)).toHaveText(/^ARAW 0\.\d+\.\d+ beta$/);
    await expect(page.locator('.preview-list dd').nth(3)).toHaveText(/Chrome/);
    await expect(page.getByText(/What gets sent:/)).toBeVisible();
    await expect(page.locator('.report-email')).toHaveText('AIKasalig@gmail.com');

    const cats = page.getByRole('group', { name: 'What kind of problem?' });
    await expect(cats.getByRole('button')).toHaveCount(4);
    await cats.getByRole('button', { name: 'Wrong or unsafe info' }).click();
    await expect(cats.getByRole('button', { name: 'Wrong or unsafe info' })).toHaveAttribute('aria-pressed', 'true');
    await expect(cats.getByRole('button', { name: 'Something broke' })).toHaveAttribute('aria-pressed', 'false');
    await page.getByLabel('Details (optional)').fill('Wrong dose & a typo?');

    const send = page.getByRole('button', { name: 'Send report' });
    if ((await send.count()) > 0) {
      await send.click();
      await expect(page.getByText(/did not go through/)).toBeVisible();
    } else {
      await expect(page.getByText(/Pick one of the ways below/)).toBeVisible();
    }

    const href = (await page.getByRole('link', { name: 'Use my email app' }).getAttribute('href')) ?? '';
    expect(href.startsWith('mailto:AIKasalig@gmail.com?')).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(params.get('subject')).toBe('[ARAW] Report: Wrong or unsafe info');
    const body = params.get('body') ?? '';
    expect(body).toContain('Screen: fact-or-fake');
    expect(body).toContain('Item: m03-c2');
    expect(body).toMatch(/App: ARAW 0\.\d+\.\d+ beta/);
    expect(body).toContain('Device: ');
    expect(body).toContain('Wrong dose & a typo?');
    expect(href).not.toMatch(/\s/);

    const gmail = page.getByRole('link', { name: /Open in Gmail/ });
    await expect(gmail).toHaveAttribute('target', '_blank');
    const gmailUrl = new URL((await gmail.getAttribute('href')) ?? '');
    expect(gmailUrl.origin).toBe('https://mail.google.com');
    expect(gmailUrl.searchParams.get('to')).toBe('AIKasalig@gmail.com');
    expect(gmailUrl.searchParams.get('su')).toBe('[ARAW] Report: Wrong or unsafe info');
    expect(gmailUrl.searchParams.get('body')).toContain('Wrong dose & a typo?');

    // Copy: works with clipboard permission, otherwise a selected read-only box asks for Ctrl+C. Either way it says so.
    await page.getByRole('button', { name: 'Copy report' }).click();
    await expect(page.getByText(/Report copied|press Ctrl\+C/)).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('Ara thanks the player and the layout has no overflow or serious a11y violations', async ({ page }) => {
    await page.goto('/#/report?screen=home');
    await expect(page.getByText(/Thank you for helping/)).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await turnEverythingOn(page);
    await page.goto('/#/report?screen=home');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });
});
