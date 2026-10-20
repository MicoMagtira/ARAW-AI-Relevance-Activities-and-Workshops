import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

async function settled(page: Page) {
  await page.waitForFunction(() => document.querySelector('.screen')?.getAnimations().every((a) => a.playState === 'finished') ?? false);
}

const seedModules = (page: Page, done: string[]) =>
  page.addInitScript((ids) => window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(ids)), done);

const ALL_MODULES = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'];

/** Pixel size of an element's box. */
async function box(loc: Locator) {
  const b = await loc.boundingBox();
  if (!b) throw new Error('element has no box');
  return b;
}

test.describe('Library: tabs', () => {
  test('four deep-linkable tabs under the banner, Myths first', async ({ page }) => {
    await page.goto('/#/library');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Library');
    const tabs = page.getByRole('tablist', { name: 'Library sections' });
    await expect(tabs.getByRole('tab')).toHaveText(['Myths', 'Dictionary', 'Comics', 'Videos']);
    await expect(tabs.getByRole('tab', { name: 'Myths' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2, name: 'Health Stories' })).toBeVisible();
    await noHorizontalOverflow(page);

    await tabs.getByRole('tab', { name: 'Dictionary' }).click();
    await expect(page).toHaveURL(/#\/library\/glossary$/);
    await expect(page.getByRole('heading', { level: 2, name: "Ara's Dictionary" })).toBeVisible();
    await tabs.getByRole('tab', { name: 'Comics' }).click();
    await expect(page).toHaveURL(/#\/library\/komiks$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Season 1: The Miracle Tea' })).toBeVisible();
    await tabs.getByRole('tab', { name: 'Videos' }).click();
    await expect(page).toHaveURL(/#\/library\/videos$/);
    await expect(page.getByRole('heading', { level: 2, name: 'How-to videos' })).toBeVisible();
    await noHorizontalOverflow(page);

    // the tab strip moves with the arrow keys and keeps focus
    await tabs.getByRole('tab', { name: 'Comics' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.getByRole('tab', { name: 'Dictionary' })).toBeFocused();
    await expect(page).toHaveURL(/#\/library\/glossary$/);

    for (const hash of ['#/library/myths', '#/library/glossary', '#/library/komiks']) {
      await page.goto(`/${hash}`);
      await settled(page);
      await noHorizontalOverflow(page);
    }
  });

  test('stays inside the screen from 320px to 2560px', async ({ page }) => {
    for (const hash of ['#/library/myths', '#/library/glossary', '#/library/komiks']) {
      for (const width of [320, 600, 1024, 2560]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${hash}`);
        await expect(page.getByRole('tablist', { name: 'Library sections' })).toBeVisible();
        await noHorizontalOverflow(page);
      }
    }
  });

  test('the Library tab in the navigation is the current page', async ({ page }) => {
    await page.goto('/#/library/komiks');
    await expect(page.locator('.nav-item[aria-current="page"], .tabbar [aria-current="page"]').filter({ hasText: 'Library' }).first()).toBeVisible();
  });
});

test.describe('Library: Myths', () => {
  test('flips a card, searches and filters', async ({ page }) => {
    await page.goto('/#/library/myths');
    const cards = page.locator('.myth-flip');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total).toBeGreaterThanOrEqual(24);

    const card = page.locator('#myth-tawa-tawa-dengue');
    const toggle = card.getByRole('button').first();
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(card.getByText('Why people believe it')).toBeVisible();
    await expect(card.getByText('How to check')).toBeVisible();
    await expect(card.getByText(/^Trick: /)).toBeVisible();
    await expect(card.getByRole('link', { name: /^Related: Module/ })).toBeVisible();
    await noHorizontalOverflow(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // the filters are behind a button on phones
    const filterToggle = page.getByRole('button', { name: /^Filters/ });
    if (await filterToggle.isVisible()) await filterToggle.click();
    await page.getByRole('button', { name: 'Dengue and mosquitoes', exact: true }).click();
    const dengue = await cards.count();
    expect(dengue).toBeGreaterThan(0);
    expect(dengue).toBeLessThan(total);
    await expect(page.getByRole('status').filter({ hasText: /myth/ })).toHaveText(`${dengue} myths`);

    await page.getByLabel('Search myths').fill('zzzzqqq');
    await expect(page.getByText(/No myth matches that/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(cards).toHaveCount(total);
    await page.getByLabel('Search myths').fill('antibiotic');
    expect(await cards.count()).toBeGreaterThan(0);
    expect(await cards.count()).toBeLessThan(total);
  });

  test('myth cards sit in a grid that fits the width', async ({ page }) => {
    await page.goto('/#/library/myths');
    const items = page.locator('.lib-grid > li');
    await expect(items.nth(1)).toBeVisible();
    await settled(page); // the screen's enter animation moves every box a little
    const width = page.viewportSize()!.width;
    const sideBySide = async () => {
      const first = await box(items.first());
      const second = await box(items.nth(1));
      return Math.abs(first.y - second.y) < 4;
    };
    if (width >= 1024) await expect.poll(sideBySide).toBe(true);
    if (width < 600) await expect.poll(sideBySide).toBe(false);
  });

  test('Myth of the day on Home links to that myth, already flipped', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-15T09:00:00'));
    await page.goto('/#/');
    const flipCard = page.getByRole('button', { name: /Myth of the day/ });
    await flipCard.click();
    const fact = await page.locator('.myth-card__fact').innerText();
    await page.getByRole('link', { name: 'More in the Library' }).click();
    await expect(page).toHaveURL(/#\/library\/myths\?myth=/);
    const opened = page.locator('.myth-flip--back');
    await expect(opened).toHaveCount(1);
    await expect(opened.locator('.myth-flip__fact')).toHaveText(fact);
    await expect(opened).toBeInViewport();
  });

  test('has no serious accessibility problems, flipped or not', async ({ page }) => {
    await page.goto('/#/library/myths');
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const id of ['tawa-tawa-dengue', 'papaya-leaf-dengue']) await page.locator(`#myth-${id} button`).first().click();
    expect(await axeSerious(page)).toEqual([]);
  });
});

test.describe('Library: Dictionary', () => {
  test('lists terms A to Z, searches and jumps to a letter', async ({ page }) => {
    await page.goto('/#/library/glossary');
    const terms = page.locator('.gl-card__term');
    await expect(terms.first()).toBeVisible();
    expect(await terms.count()).toBeGreaterThanOrEqual(30);
    const names = (await terms.allInnerTexts()).map((s) => s.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await expect(page.getByText(/^Example: /).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Seen in Module \d+: / }).first()).toBeVisible();

    const letters = await page.locator('.gl-letter').allInnerTexts();
    const target = letters[letters.length - 1]!;
    await page.getByRole('button', { name: `Jump to ${target}` }).click();
    await expect(page.locator(`#gl-${target}`)).toBeFocused();
    await expect(page.locator(`#gl-${target}`)).toBeInViewport();

    await page.getByLabel('Search a word').fill('deepfake');
    await expect(page.getByRole('heading', { level: 4, name: 'Deepfake' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jump to Q' })).toBeDisabled();
    await page.getByLabel('Search a word').fill('zzzzqqq');
    await expect(page.getByText(/No word matches that/)).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('the A to Z index scrolls sideways on phones without scrolling the page', async ({ page }) => {
    await page.goto('/#/library/glossary');
    if (page.viewportSize()!.width >= 600) return;
    const scroller = await page.locator('.az').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(scroller.scroll).toBeGreaterThan(scroller.client);
    await noHorizontalOverflow(page);
  });

  test('has no serious accessibility problems', async ({ page }) => {
    await page.goto('/#/library/glossary');
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
  });
});

test.describe('Library: Comics', () => {
  test('every episode is locked on a fresh start, and says which module opens it', async ({ page }) => {
    await page.goto('/#/library/komiks');
    await expect(page.getByText('0 of 10 episodes unlocked')).toBeVisible();
    await expect(page.locator('.ep-card--locked')).toHaveCount(10);
    await expect(page.locator('a.ep-card')).toHaveCount(0);
    await expect(page.getByText('Finish Module 3 to unlock').first()).toBeVisible();

    await page.goto('/#/library/komiks/2');
    await expect(page.getByRole('heading', { name: 'Episode 2 is locked' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Learn' })).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('unlocked episodes open the reader; phone and tablet swap the list for it', async ({ page }) => {
    await seedModules(page, ['m01', 'm02']);
    await page.goto('/#/library/komiks');
    await expect(page.getByText('2 of 10 episodes unlocked')).toBeVisible();
    await expect(page.locator('a.ep-card')).toHaveCount(2);
    await expect(page.locator('a.ep-card').first().getByText('New!')).toBeVisible();
    await page.getByRole('link', { name: /The Miracle Tea/ }).click();
    await expect(page).toHaveURL(/#\/library\/komiks\/1$/);
    await expect(page.getByRole('heading', { level: 2, name: 'The Miracle Tea', exact: true }).last()).toBeFocused();
    const wide = page.viewportSize()!.width >= 1024;
    if (wide) await expect(page.locator('.komiks__list')).toBeVisible();
    else {
      await expect(page.locator('.komiks__list')).toBeHidden();
      await expect(page.getByRole('link', { name: 'All episodes' }).first()).toBeVisible();
    }
    await noHorizontalOverflow(page);
  });

  test('reads an episode panel by panel with buttons, arrow keys and swipes', async ({ page }) => {
    await seedModules(page, ['m01', 'm02']);
    await page.goto('/#/library/komiks/1');
    const status = page.getByRole('status').filter({ hasText: /^Panel \d of \d$/ });
    await expect(status).toHaveText('Panel 1 of 5');

    const art = page.locator('.reader__stage .komiks-scene');
    await expect(art).toHaveAttribute('role', 'img');
    await expect(art).toHaveAttribute('aria-label', /Tita Baby sits on the living-room sofa/);
    const artBox = await box(art);
    expect(artBox.width).toBeGreaterThan(200);
    expect(Math.abs(artBox.width / artBox.height - 8 / 5)).toBeLessThan(0.05);
    // the fake ad is stamped and its words are real text
    await expect(page.locator('.kscreen').getByText('ARAW GAME · FAKE')).toBeVisible();
    await expect(page.locator('.kbubble').first()).toContainText('Tita Baby');
    await noHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(status).toHaveText('Panel 2 of 5');
    await page.keyboard.press('ArrowRight');
    await expect(status).toHaveText('Panel 3 of 5');
    await page.keyboard.press('ArrowLeft');
    await expect(status).toHaveText('Panel 2 of 5');
    await page.getByRole('button', { name: 'Go to panel 4' }).click();
    await expect(status).toHaveText('Panel 4 of 5');

    const swipe = (from: number, to: number) =>
      page.locator('.reader__stage').evaluate(
        (el, [a, b]) => {
          const fire = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', clientX: x, clientY: 200 }));
          fire('pointerdown', a as number);
          fire('pointerup', b as number);
        },
        [from, to],
      );
    await swipe(300, 100);
    await expect(status).toHaveText('Panel 5 of 5');
    await swipe(100, 300);
    await expect(status).toHaveText('Panel 4 of 5');

    // the last panel ends kindly and offers the next episode
    await page.getByRole('button', { name: 'Go to panel 5' }).click();
    await expect(page.getByText('The end of Episode 1')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Next episode: / })).toHaveAttribute('href', '#/library/komiks/2');
    await noHorizontalOverflow(page);
    await page.getByRole('link', { name: /^Next episode: / }).click();
    await expect(page).toHaveURL(/#\/library\/komiks\/2$/);
    await expect(status).toHaveText(/^Panel 1 of \d$/);
  });

  test('finishing an episode marks it Read in the list', async ({ page }) => {
    await seedModules(page, ['m01']);
    await page.goto('/#/library/komiks/1');
    await page.getByRole('button', { name: /^Go to panel 5$/ }).click();
    await page.getByRole('link', { name: 'All episodes' }).last().click();
    await expect(page.locator('a.ep-card').first().getByText('Read')).toBeVisible();
    await page.reload();
    await expect(page.locator('a.ep-card').first().getByText('Read')).toBeVisible();
  });

  test('every panel of every episode draws a scene and keeps words readable', async ({ page }) => {
    test.setTimeout(90_000);
    await seedModules(page, ALL_MODULES);
    for (let n = 1; n <= 10; n++) {
      await page.goto(`/#/library/komiks/${n}`);
      const status = page.getByRole('status').filter({ hasText: /^Panel \d of \d$/ });
      const total = Number((await status.innerText()).replace(/^Panel 1 of /, ''));
      expect(total).toBeGreaterThanOrEqual(4);
      expect(total).toBeLessThanOrEqual(6);
      for (let i = 1; i <= total; i++) {
        await page.getByRole('button', { name: `Go to panel ${i}` }).click();
        const art = page.locator('.reader__stage .komiks-scene');
        await expect(art).toHaveAttribute('aria-label', /.{20,}/);
        expect(await art.locator('path').count()).toBeGreaterThan(5);
        const sizes = await page.locator('.reader__stage .kbubble__text').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
        expect(sizes.every((px) => px >= 16)).toBe(true);
      }
      await noHorizontalOverflow(page);
    }
  });

  test('the transcript has every panel as text', async ({ page }) => {
    await seedModules(page, ['m01']);
    await page.goto('/#/library/komiks/1');
    const details = page.locator('.reader__transcript');
    await details.getByText('Read the whole episode as text').click();
    await expect(details.locator('li')).toHaveCount(5);
    await expect(details).toContainText('Tita Baby says:');
    await expect(details).toContainText('[ARAW GAME · FAKE]');
    await noHorizontalOverflow(page);
  });

  test('a new player with every episode locked: the scrolling list is still keyboard reachable', async ({ page }) => {
    await page.goto('/#/library/komiks');
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await expect(page.locator('.komiks__list')).toHaveAttribute('tabindex', '0');
  });

  test('has no serious accessibility problems in the list, the reader and a locked episode', async ({ page }) => {
    await seedModules(page, ['m01', 'm02']);
    for (const hash of ['#/library/komiks', '#/library/komiks/1', '#/library/komiks/5']) {
      await page.goto(`/${hash}`);
      await settled(page);
      expect(await axeSerious(page), hash).toEqual([]);
    }
    await page.goto('/#/library/komiks/2');
    await settled(page);
    await page.getByRole('button', { name: 'Go to panel 3' }).click();
    expect(await axeSerious(page)).toEqual([]);
  });

  test('all accessibility settings on: still readable, still inside the screen', async ({ page }) => {
    await seedModules(page, ['m01']);
    await page.goto('/#/me');
    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await page.getByRole('switch', { name }).click();
    }
    for (const hash of ['#/library/myths', '#/library/glossary', '#/library/komiks', '#/library/komiks/1']) {
      await page.goto(`/${hash}`);
      await settled(page);
      await noHorizontalOverflow(page);
      expect(await axeSerious(page), hash).toEqual([]);
    }
  });
});
