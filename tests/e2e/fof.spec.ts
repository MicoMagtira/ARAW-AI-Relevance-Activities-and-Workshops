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

/** Wait for entrance animations so axe and screenshots see final colours. */
async function settled(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getTiming().iterations === Infinity));
}

/** Answer the current item and return whether it was right. Fake is the answer, so right means the item was a fake. */
async function answerFake(page: Page): Promise<boolean> {
  await page.getByRole('button', { name: 'Fake', exact: true }).click();
  const feedback = page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ });
  await expect(feedback).toBeVisible();
  return /Tama!/.test((await feedback.textContent()) ?? '');
}

const SEED = '#/play/fact-or-fake?seed=e2e-seed-2'; // its first round holds all four formats

test.describe('Fact or Fake free play', () => {
  test('plays a round: feedback card, stamp, report link, then Truth Radar results with XP', async ({ page }) => {
    await page.goto(SEED);
    await expect(page.getByRole('heading', { level: 1, name: 'Fact or Fake' })).toBeAttached();
    await expect(page.getByText(/Fact or Fake · 1 of 10/)).toBeVisible();
    await expect(page.getByText('ARAW GAME', { exact: true })).toBeVisible(); // watermark before reveal
    await expect(page.getByText('ARAW GAME · FAKE')).toHaveCount(0);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    // the quiet feedback placeholder shows on desktop only, and goes away with the first answer
    const placeholder = page.getByText('Your feedback appears here');
    if ((page.viewportSize()?.width ?? 0) >= 1024) await expect(placeholder).toBeVisible();
    else await expect(placeholder).toBeHidden();

    let right = 0;
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(new RegExp(`Fact or Fake · ${i + 1} of 10`))).toBeVisible();
      const correct = await answerFake(page);
      if (correct) right++;
      await expect(page.getByText('ARAW GAME · FAKE')).toHaveCount(correct ? 1 : 0);
      await expect(page.getByRole('link', { name: /^Report this item \(fof-p-\d{3}\)$/ })).toBeVisible();
      if (i === 0) {
        await expect(page.getByText(/^Why:/)).toBeVisible();
        await expect(page.getByText(/^How to check:/)).toBeVisible();
        await settled(page);
        await noHorizontalOverflow(page);
        expect(await axeSerious(page)).toEqual([]);
      }
      await page.getByRole('button', { name: i === 9 ? 'See my Truth Radar' : 'Next' }).click();
    }
    expect(right).toBe(5); // a balanced round: five fakes among ten

    await expect(page.getByRole('heading', { level: 2, name: 'Your Truth Radar' })).toBeVisible();
    await expect(page.getByText('5 of 10 right')).toBeVisible();
    await expect(page.getByText('+50 XP')).toBeVisible();
    await expect(page.getByRole('meter', { name: 'How well you tell them apart' })).toBeVisible();
    await expect(page.getByText('Leans doubtful')).toBeVisible(); // always answering Fake
    await expect(page.getByText(/Rough read/)).toHaveCount(0); // a full 10-item round
    await page.getByText('Show the numbers').click();
    await expect(page.getByText('Discernment (d-prime)')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    // XP is on the profile, and a new round starts with a fresh seed
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText(/Fact or Fake · 1 of 10/)).toBeVisible();
    await page.goto('/#/me');
    await expect(page.getByRole('definition').filter({ hasText: /^50$/ })).toBeVisible();
  });

  test('keyboard: arrows answer, Enter moves on', async ({ page }) => {
    await page.goto(SEED);
    await expect(page.getByText(/Fact or Fake · 1 of 10/)).toBeVisible();
    // the key listener is added a moment after the first paint, so retry the first press
    await expect(async () => {
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ })).toBeVisible({ timeout: 500 });
    }).toPass();
    await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Fact or Fake · 2 of 10/)).toBeVisible();
    await page.keyboard.press('l');
    await expect(page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ })).toBeVisible();
  });

  test('touch swipe answers: right is Fact, left is Fake', async ({ page }) => {
    await page.goto(SEED);
    await expect(page.getByText(/Fact or Fake · 1 of 10/)).toBeVisible();
    const swipe = (dx: number) =>
      page.evaluate((delta) => {
        const el = document.querySelector('.fof-swipe') as HTMLElement;
        const fire = (type: string, x: number) =>
          el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7, clientX: x, clientY: 300, bubbles: true, cancelable: true }));
        fire('pointerdown', 200);
        fire('pointermove', 200 + delta / 2);
        fire('pointermove', 200 + delta);
        fire('pointerup', 200 + delta);
      }, dx);
    await swipe(160);
    await expect(page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ })).toContainText(/FACT|FAKE/);
    await page.getByRole('button', { name: 'Next' }).click();
    await swipe(-160);
    await expect(page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ })).toBeVisible();
    await expect(page.getByText(/Fact or Fake · 2 of 10/)).toBeVisible();
    // a short drag does nothing
    await page.getByRole('button', { name: 'Next' }).click();
    await swipe(20);
    await expect(page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ })).toHaveCount(0);
  });

  test('the Report link carries the item id into the report screen', async ({ page }) => {
    await page.goto(SEED);
    await answerFake(page);
    await page.getByRole('link', { name: /^Report this item/ }).click();
    await expect(page).toHaveURL(/#\/report\?screen=fact-or-fake&item=fof-p-\d{3}/);
    await expect(page.getByRole('heading', { level: 1, name: 'Report' })).toBeVisible();
  });

  test('every item format renders and fits, with alt text on pictures', async ({ page }) => {
    await page.goto(SEED);
    const formats = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const card = page.locator('.fof-card');
      formats.add(((await card.getAttribute('class')) ?? '').match(/fof-card--(\w+)/)?.[1] ?? '');
      if ((await page.locator('.fof-scene__svg').count()) > 0) {
        await expect(page.getByRole('img', { name: /synthetic/ })).toBeVisible();
      }
      await noHorizontalOverflow(page);
      await page.getByRole('button', { name: 'Fake', exact: true }).click();
      await noHorizontalOverflow(page);
      await page.getByRole('button', { name: i === 9 ? 'See my Truth Radar' : 'Next' }).click();
    }
    expect([...formats].sort()).toEqual(['chatbot_answer', 'gc_screenshot', 'image', 'text']);
  });

  test('quitting mid-round asks first; quitting before answering does not', async ({ page }) => {
    await page.goto(SEED);
    await page.getByRole('button', { name: 'Quit round' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await page.goto(SEED);
    await answerFake(page);
    await page.getByRole('button', { name: 'Quit round' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Quit this round?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep playing' }).click();
    await expect(page.getByText(/Fact or Fake · 1 of 10/)).toBeVisible();
    await page.getByRole('button', { name: 'Quit round' }).first().click();
    await page.getByRole('dialog').getByRole('link', { name: 'Quit round' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
  });

  test('the Arcade links to free play', async ({ page }) => {
    await page.goto('/#/arcade');
    await page.getByRole('link', { name: 'Play Fact or Fake' }).click();
    await expect(page).toHaveURL(/#\/play\/fact-or-fake$/);
    await expect(page.getByText(/Fact or Fake · 1 of/)).toBeVisible();
  });

  test('every setting on: the round still fits and stays accessible', async ({ page }) => {
    await page.goto('/#/me');
    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await page.getByRole('switch', { name }).click();
    }
    await page.goto(SEED);
    await answerFake(page);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('works with blocked storage', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto(SEED);
    await answerFake(page);
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });
});

test.describe('Hidden assessment forms', () => {
  test('form A plays without feedback and ends with the Radar and no XP', async ({ page }) => {
    await page.goto('/#/assess/form_A');
    await expect(page.getByRole('heading', { level: 1, name: 'Assessment · Form A' })).toBeAttached();
    await expect(page.getByText(/Fact or Fake · 1 of 20/)).toBeVisible();
    await expect(page.getByText('No feedback until the end.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Report/ })).toHaveCount(0);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('button', { name: 'Fact', exact: true }).click();
    await expect(page.getByText(/Fact or Fake · 2 of 20/)).toBeVisible();
    await expect(page.getByText(/Tama!|Muntik na!/)).toHaveCount(0);
    await expect(page.getByText('ARAW GAME · FAKE')).toHaveCount(0);
    for (let i = 2; i <= 20; i++) {
      await expect(page.getByText(new RegExp(`Fact or Fake · ${i} of 20`))).toBeVisible();
      await page.getByRole('button', { name: 'Fake', exact: true }).click();
    }

    await expect(page.getByRole('heading', { level: 2, name: 'Assessment complete' })).toBeVisible();
    await expect(page.getByText(/^\d+ of 20 right$/)).toBeVisible();
    await expect(page.getByText(/^\+\d+ XP$/)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Your Truth Radar' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('link', { name: 'Done' }).click();
    await expect(page).toHaveURL(/#\/$/);
  });

  test('form B works and an unknown form says so; nothing links to the forms', async ({ page }) => {
    await page.goto('/#/assess/form_B');
    await expect(page.getByRole('heading', { level: 1, name: 'Assessment · Form B' })).toBeAttached();
    await page.goto('/#/assess/form_Z');
    await expect(page.getByRole('heading', { level: 2, name: 'This assessment does not exist' })).toBeVisible();
    await noHorizontalOverflow(page);
    for (const route of ['/#/', '/#/learn', '/#/arcade', '/#/library', '/#/me']) {
      await page.goto(route);
      await expect(page.locator('a[href*="assess"]')).toHaveCount(0);
    }
  });
});
