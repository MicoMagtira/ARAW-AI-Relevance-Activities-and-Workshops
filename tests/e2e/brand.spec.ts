import AxeBuilder from '@axe-core/playwright';
import { test as base, type Locator, type Page } from '@playwright/test';
import { expect, noHorizontalOverflow, passLanding, test } from './fixtures';

/** Project order, fixed by AIKasalig. */
const PARTNERS = [/^Department of Science and Technology/, /DOST-PCHRD/, /^National University$/, /NICER\)$/, /RDC-NLPHA/, /^AIKasalig$/];

async function expectPartners(list: Locator) {
  await expect(list).toBeVisible();
  const logos = list.getByRole('img');
  await expect(logos).toHaveCount(PARTNERS.length);
  for (const [i, name] of PARTNERS.entries()) {
    const logo = logos.nth(i);
    await expect(logo).toHaveAccessibleName(name);
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  // same design size: every logo is drawn big enough to read, and none dwarfs the others
  const heights = await logos.evaluateAll((imgs) => imgs.map((img) => img.getBoundingClientRect().height));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(14);
  expect(Math.max(...heights) / Math.min(...heights)).toBeLessThan(2.2);
}

async function axeClean(page: Page) {
  await page.waitForFunction(() => document.querySelector('.screen')?.getAnimations().every((a) => a.playState === 'finished') ?? true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe('project identity', () => {
  test('Home opens with the ARAW banner and the partner band, which links to About', async ({ page }) => {
    await page.goto('/#/');
    const banner = page.locator('.home-banner');
    await expect(banner.getByRole('heading', { name: 'ARAW' })).toBeVisible();
    await expect(banner.getByText('AIKasalig · DOST-NICER')).toBeVisible();
    await expect(banner.getByText('AI Relevance Activities and Workshops')).toBeVisible();
    await expectPartners(banner.getByRole('list', { name: 'Project partners' }));
    await noHorizontalOverflow(page);
    await axeClean(page);
    await banner.getByRole('link', { name: 'About the project' }).click();
    await expect(page).toHaveURL(/#\/about$/);
  });

  test('About shows the logo wall, the project story, the dates and the credits', async ({ page }) => {
    await page.goto('/#/about');
    await expect(page.getByRole('heading', { level: 2, name: 'About the project' })).toBeVisible();
    await expectPartners(page.getByRole('list', { name: 'Project partners' }));
    await expect(page.getByRole('heading', { name: 'Part of a DOST-NICER program' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where ARAW fits' })).toBeVisible();
    await expect(page.getByText('February 2026 to January 2029 (36 months)')).toBeVisible();
    await expect(page.getByText('Dr. Mideth B. Abisado')).toBeVisible();
    await expect(page.getByText(/Code: MIT licence/)).toBeVisible();
    await noHorizontalOverflow(page);
    await axeClean(page);
  });

  test('the desktop sidebar links to About; smaller screens reach it from Home and Me', async ({ page }) => {
    await page.goto('/#/learn');
    const link = page.getByRole('navigation', { name: 'More' }).getByRole('link', { name: 'About the project' });
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await link.click();
      await expect(page).toHaveURL(/#\/about$/);
      await expect(link).toHaveAttribute('aria-current', 'page');
    } else {
      await expect(link).toBeHidden();
      await page.goto('/#/me');
      await page.getByRole('link', { name: /About and licences/ }).click();
      await expect(page).toHaveURL(/#\/about$/);
    }
  });
});

base.describe('project identity on the start screens', () => {
  base('the language landing and the sunrise splash carry the partner logos; START stays on screen', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expectPartners(page.locator('#landing').getByRole('list', { name: 'Project partners' }));
    await noHorizontalOverflow(page);
    await passLanding(page);
    const splash = page.locator('#splash');
    await expect(splash.getByText('An AIKasalig project')).toBeVisible();
    await expectPartners(splash.getByRole('list', { name: 'Project partners' }));
    const start = page.getByRole('button', { name: 'Start' });
    await expect(start).toBeInViewport({ ratio: 1 });
    await noHorizontalOverflow(page);
  });
});
