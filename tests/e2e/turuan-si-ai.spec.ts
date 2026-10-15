import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { LOCAL_POSTS, TRAIN_POSTS, type TuruanPost } from '../../src/content/turuan';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

/** Wait for entrance animations so contrast and layout are measured on the final state. */
async function settled(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .every((a) => a.playState === 'finished'),
  );
}

/** Open the game step directly (module 1 done, all eight lesson cards done). */
async function openGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8 }));
  });
  await page.goto('/#/');
  await page.goto('/#/learn/m02');
  await expect(page.getByRole('heading', { level: 2, name: 'Turuan si AI' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Step 1: Teach the detector' })).toBeVisible();
}

const labelOf = (p: TuruanPost) => (p.label === 'fake' ? 'Fake' : 'Real');

/** Label every post of a step with the true label (or `labelFor`), then press the last button. */
async function labelAll(page: Page, posts: readonly TuruanPost[], last: string, labelFor: (p: TuruanPost) => string = labelOf) {
  for (const [i, post] of posts.entries()) {
    await expect(page.getByText(`Post ${i + 1} of ${posts.length}`)).toBeVisible();
    await expect(page.getByText(post.text)).toBeVisible();
    await page.getByRole('button', { name: labelFor(post), exact: true }).click();
    await page.getByRole('button', { name: i === posts.length - 1 ? last : 'Next post' }).click();
  }
}

test.describe('Turuan si AI', () => {
  test('shows the first post, fits the screen and is accessible before and after a label', async ({ page }) => {
    await openGame(page);
    await expect(page.getByText('Post 1 of 10')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fake', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Real', exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Game steps' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('button', { name: 'Fake', exact: true }).click();
    await expect(page.getByText('Good label! This post is Fake.')).toBeVisible();
    await expect(page.getByText('ARAW GAME · FAKE')).toBeVisible();
    await expect(page.getByText('10 pts')).toBeVisible();
    // the Next button takes focus so keyboard and screen-reader users continue from the feedback
    await expect(page.getByRole('button', { name: 'Next post' })).toBeFocused();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('desktop puts the feedback beside the post; phone stacks it below', async ({ page }, info) => {
    await openGame(page);
    await page.getByRole('button', { name: 'Fake', exact: true }).click();
    const post = await page.locator('.tu-label__post').boundingBox();
    const side = await page.locator('.tu-label__side').boundingBox();
    if (!post || !side) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') expect(side.x).toBeGreaterThan(post.x + post.width - 1);
    else if (info.project.name === 'phone') expect(side.y).toBeGreaterThanOrEqual(post.y + post.height - 1);
  });

  test('trains, fails on local fakes, explains why, learns local words and improves', async ({ page }) => {
    await openGame(page);
    await labelAll(page, TRAIN_POSTS, 'Train the detector');

    // test: 4 of 8, every local-language fake slips through
    await expect(page.getByRole('heading', { name: 'Step 2: Test the detector' })).toBeVisible();
    await expect(page.getByText('4 of 8 posts right')).toBeVisible();
    await expect(page.getByText(/It caught only 0 of 4 fakes in Taglish and Cebuano/)).toBeVisible();
    await expect(page.locator('.tu-verdict--wrong')).toHaveCount(4);
    await expect(page.getByRole('meter', { name: 'Detector accuracy' })).toHaveAttribute('aria-valuenow', '50');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    // Why? highlights the words it relied on and dots the words it never saw
    const missed = page
      .locator('.tu-result')
      .filter({ has: page.locator('.tu-verdict--wrong') })
      .first();
    const why = missed.getByRole('button', { name: /why/i });
    await expect(why).toHaveAttribute('aria-expanded', 'false');
    await why.click();
    await expect(why).toHaveAttribute('aria-expanded', 'true');
    await expect(missed.getByText(/It relied on these words:/)).toBeVisible();
    await expect(missed.locator('mark.tu-mark').first()).toBeVisible();
    await expect(missed.locator('.tu-unknown').first()).toBeVisible();
    await expect(missed.getByText(/It had never seen \d+ of the \d+ words it looked at\./)).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    // fix: label the local-language posts, then retrain
    await page.getByRole('button', { name: 'Teach it Taglish and Cebuano' }).click();
    await expect(page.getByRole('heading', { name: 'Step 3: Teach it local words' })).toBeFocused();
    await settled(page);
    await noHorizontalOverflow(page);
    await labelAll(page, LOCAL_POSTS, 'Retrain the detector');

    await expect(page.getByRole('heading', { name: 'Step 4: Test it again' })).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Before: English only' })).toHaveAttribute('aria-valuenow', '50');
    await expect(page.getByRole('meter', { name: 'After: with local words' })).toHaveAttribute('aria-valuenow', '100');
    await expect(page.getByText('8 of 8 posts right')).toBeVisible();
    await expect(page.locator('.tu-verdict--wrong')).toHaveCount(0);
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByText('You labelled 16 of 16 posts right: 160 points.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    // finishing hands over to the module runner: the game always counts
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });

  test('wrong labels still finish the game, with one star', async ({ page }) => {
    await openGame(page);
    await labelAll(page, TRAIN_POSTS, 'Train the detector', () => 'Real');
    await page.getByRole('button', { name: 'Teach it Taglish and Cebuano' }).click();
    await labelAll(page, LOCAL_POSTS, 'Retrain the detector', () => 'Real');
    await expect(page.getByRole('img', { name: '1 of 3 stars' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });
});
