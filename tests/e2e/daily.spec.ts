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

async function settled(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getTiming().iterations === Infinity));
}

// 2026-10-15 is a Thursday; the featured game that day is Feed Mo 'To.
const TODAY = new Date('2026-10-15T09:00:00');
const seed = (page: Page, key: string, value: unknown) =>
  // only when nothing is saved yet, so a reload keeps what the app saved in between
  page.addInitScript(([k, v]) => window.localStorage.getItem(`araw:v1:${k}`) ?? window.localStorage.setItem(`araw:v1:${k}`, JSON.stringify(v)), [key, value] as const);
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(`araw:v1:${k}`), key);

/** Answer the 3 daily items (always "Fake": right or wrong does not matter here) and finish. */
async function playItems(page: Page) {
  await page.getByRole('button', { name: 'Start the 3 items' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Fake', exact: true }).click();
    await page.getByRole('button', { name: i === 2 ? 'See my result' : 'Next' }).click();
  }
}

test.describe('Daily Challenge', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
  });

  test("shows today's game and 3 items, waits for both steps, and fits every width", async ({ page }) => {
    await page.goto('/#/daily');
    await expect(page.getByRole('heading', { level: 1, name: 'Daily Challenge' })).toBeVisible();
    await expect(page.getByText('Daily Challenge · OCT 15')).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Step 1: Today’s game' })).toBeVisible();
    await expect(page.getByText("Feed Mo 'To", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Play today’s game|Trial run/ })).toHaveAttribute('href', '#/arcade/feed-mo-to?seed=daily');
    await expect(page.getByRole('heading', { level: 3, name: 'Step 2: 3 Fact or Fake items' })).toBeVisible();
    await expect(page.getByText('Finish both steps to get your result card.')).toBeVisible();
    await expect(page.getByText('0 of 2 steps done')).toBeVisible();
    await expect(page.getByText('Streak freeze ready this week')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('items after a saved game run: result card, copy, streak and the one-try rule', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await seed(page, 'streak', { current: 3, best: 3, lastDay: '2026-10-14', freezeWeek: null });
    await seed(page, 'daily', { date: '2026-10-15', game: { slug: 'feed-mo-to', score: 1240, bands: 3 }, fof: null });
    await page.goto('/#/daily');
    await expect(page.getByText('Done: 1,240 points')).toBeVisible();
    await expect(page.getByText('Play again for fun')).toBeVisible();
    await expect(page.getByText('Replays do not change your daily result.')).toBeVisible();

    await playItems(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Your Daily result' })).toBeVisible();
    await expect(page.getByText('Daily complete!')).toBeVisible();
    await expect(page.getByText('+30 XP bonus')).toBeVisible();
    const share = page.getByTestId('daily-share');
    await expect(share).toContainText('ARAW Daily · 15 Oct 2026');
    await expect(share).toContainText("Feed Mo 'To 🟨🟨🟨⬜⬜ 1,240");
    await expect(share).toContainText(/Fact or Fake [🟩🟥]{3}/u);
    await expect(share).toContainText('🔥 4-day streak');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('button', { name: 'Copy result' }).click();
    await expect(page.getByText('Copied! Paste it in your group chat.')).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.replace(/\r/g, '')).toBe((await share.innerText()).replace(/\r/g, ''));

    // saved: one attempt a day, still there after a reload; the items cannot be replayed
    await page.reload();
    await expect(page.getByText('Daily complete!')).toBeVisible();
    await expect(page.getByText('The 3 items count once a day, so there is no replay.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start the 3 items' })).toHaveCount(0);
    expect(JSON.parse((await stored(page, 'daily')) ?? '{}')).toMatchObject({ date: '2026-10-15', game: { score: 1240 } });
    expect(Number(await stored(page, 'xp'))).toBeGreaterThanOrEqual(30); // the bonus, plus 10 per right answer
    // Home shows it as done
    await page.goto('/#/');
    await expect(page.getByText('Nice work! Come back tomorrow for a new one.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See your result' })).toHaveAttribute('href', '#/daily');
  });

  test('a streak freeze covers one missed day and says so', async ({ page }) => {
    await seed(page, 'streak', { current: 4, best: 4, lastDay: '2026-10-13', freezeWeek: null });
    await page.goto('/#/daily');
    // Wednesday was missed: the streak still shows while the freeze can cover it
    await expect(page.getByText('4-day streak')).toBeVisible();
    await playItems(page);
    await expect(page.getByText('Streak freeze used! ❄️')).toBeVisible();
    await expect(page.getByText('5-day streak')).toBeVisible();
    await expect(page.getByText('Streak freeze used this week ❄️')).toBeVisible();
    expect(JSON.parse((await stored(page, 'streak')) ?? '{}')).toMatchObject({ current: 5, freezeWeek: '2026-10-12' });
  });

  test('a lapsed streak starts again kindly', async ({ page }) => {
    await seed(page, 'streak', { current: 9, best: 9, lastDay: '2026-10-10', freezeWeek: null });
    await page.goto('/#/daily');
    await expect(page.getByText('0-day streak')).toBeVisible();
    await playItems(page);
    await expect(page.getByText('Bagong simula!')).toBeVisible();
    await expect(page.getByText('1-day streak')).toBeVisible();
    await expect(page.getByText('Best: 9 days')).toBeVisible();
  });

  test('the first daily run of a game counts, then leads back to the Daily Challenge', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['demo'])));
    await page.goto('/#/arcade/demo?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Game over|Good run!/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('link', { name: 'Back to Daily Challenge' }).first().click();
    await expect(page).toHaveURL(/#\/daily$/);
    await expect(page.getByText(/^Done: \d+ points$/)).toBeVisible();
    expect(JSON.parse((await stored(page, 'daily')) ?? '{}')).toMatchObject({ date: '2026-10-15', game: { slug: 'demo' } });
  });

  test('works when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
    });
    await page.goto('/#/daily');
    await playItems(page);
    await expect(page.getByText('1 of 2 steps done')).toBeVisible();
  });
});
