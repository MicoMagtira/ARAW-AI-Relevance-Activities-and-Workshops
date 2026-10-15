import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { TACTIC_POSTS, VILLAINS, type TacticPost } from '../../src/content/tactics';
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

async function checkScreen(page: Page) {
  await settled(page);
  await noHorizontalOverflow(page);
  expect(await axeSerious(page)).toEqual([]);
}

/** Open the game directly (modules 1 to 3 done, all of module 4's lesson cards done). `?seed=` repeats the draw. */
async function openGame(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript((saved) => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8 }));
    for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(`araw:v1:${key}`, JSON.stringify(value));
  }, extra);
  await page.goto('/#/');
  await page.goto('/#/learn/m04?seed=e2e');
  await expect(page.getByRole('heading', { level: 2, name: 'Spot the Tactic' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Spot the Tactic' })).toBeVisible();
}

const start = (page: Page) => page.getByRole('button', { name: 'Start spotting' }).click();
const pickButton = (page: Page, trick: TacticPost['trick']) => {
  if (trick === 'none') return page.getByRole('button', { name: /^No trick, it is legit/ });
  const name = VILLAINS.find((v) => v.id === trick)?.name ?? '';
  return page.getByRole('button', { name: new RegExp(`^${name.replace('.', '\\.')}:`) });
};

/** The post on screen, found from its text. */
async function currentPost(page: Page): Promise<TacticPost> {
  const text = (await page.locator('.tt-post__text').textContent()) ?? '';
  const post = TACTIC_POSTS.find((p) => p.text === text);
  if (!post) throw new Error(`unknown post: ${text}`);
  return post;
}

/** Play the twelve posts. `wrong` lists post numbers (1-based) to answer wrongly. */
async function playAll(page: Page, wrong: readonly number[] = []) {
  for (let i = 1; i <= 12; i++) {
    await expect(page.getByText(`Post ${i} of 12`)).toBeVisible();
    const post = await currentPost(page);
    const pick = wrong.includes(i) ? (post.trick === 'none' ? 'dr_fake' : 'none') : post.trick;
    await pickButton(page, pick).click();
    await page.getByRole('button', { name: i === 12 ? 'See my result' : 'Next post' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Spotting finished!' })).toBeVisible();
}

test.describe('Spot the Tactic', () => {
  test('the intro shows the five locked villain cards, fits the screen and is accessible', async ({ page }) => {
    await openGame(page);
    await expect(page.getByText('0 of 5 cards collected')).toBeVisible();
    await expect(page.locator('.tt-card')).toHaveCount(5);
    for (const v of VILLAINS) await expect(page.getByRole('heading', { name: v.name })).toBeVisible();
    await expect(page.getByText(/Spot this trick 3 times in a row/).first()).toBeVisible();
    await checkScreen(page);
  });

  test('a post shows six picks; a right pick gives feedback, the stamp and focuses Next', async ({ page }) => {
    await openGame(page);
    await start(page);
    await expect(page.getByText('Post 1 of 12')).toBeVisible();
    const post = await currentPost(page);
    for (const v of VILLAINS) await expect(pickButton(page, v.id)).toBeVisible();
    await expect(pickButton(page, 'none')).toBeVisible();
    await checkScreen(page);

    await pickButton(page, post.trick).click();
    await expect(page.getByText(post.why)).toBeVisible();
    await expect(page.getByText('+10 points')).toBeVisible();
    await expect(page.getByText('10 pts')).toBeVisible();
    if (post.trick === 'none') await expect(page.getByText('Legit post')).toBeVisible();
    else await expect(page.getByText('ARAW GAME · FAKE')).toBeVisible();
    await expect(page.locator('.tt-mark').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next post' })).toBeFocused();
    await checkScreen(page);
  });

  test('a wrong pick says Muntik na! and highlights the tell-tale signs', async ({ page }) => {
    await openGame(page);
    await start(page);
    const post = await currentPost(page);
    await pickButton(page, post.trick === 'none' ? 'dr_fake' : 'none').click();
    await expect(page.getByText('Muntik na!', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('No points this time. On to the next one!')).toBeVisible();
    await expect(page.locator('.tt-mark')).toHaveCount(post.marks.length);
    await checkScreen(page);
  });

  test('desktop puts the picks beside the post; phone stacks them below', async ({ page }, info) => {
    await openGame(page);
    await start(page);
    const postBox = await page.locator('.tt-round__post').boundingBox();
    const side = await page.locator('.tt-round__side').boundingBox();
    if (!postBox || !side) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') expect(side.x).toBeGreaterThan(postBox.x + postBox.width - 1);
    else if (info.project.name === 'phone') expect(side.y).toBeGreaterThanOrEqual(postBox.y + postBox.height - 1);
  });

  test('the third right pick in a row beats a villain: new card, badge toast, and the collection shows it', async ({ page }) => {
    await openGame(page, { tacticStreaks: { dr_fake: 2 } });
    await start(page);
    // play right until the first Dr. Fake post; any other post is answered rightly too
    for (let i = 1; i <= 12; i++) {
      const post = await currentPost(page);
      await pickButton(page, post.trick).click();
      if (post.trick === 'dr_fake') {
        await expect(page.getByText('New card unlocked!')).toBeVisible();
        await expect(page.getByText('Dr. Fake is beaten!').first()).toBeVisible();
        await expect(page.getByText('Badge earned: Talo si Dr. Fake').first()).toBeVisible();
        await settled(page);
        await noHorizontalOverflow(page);
        break;
      }
      await page.getByRole('button', { name: 'Next post' }).click();
    }
    await page.getByRole('button', { name: /^(Next post|See my result)$/ }).click();
    // finish the rest of the play, then the collection shows Dr. Fake as won
    for (let i = 0; i < 12; i++) {
      if (await page.getByRole('heading', { name: 'Spotting finished!' }).count()) break;
      const post = await currentPost(page);
      await pickButton(page, post.trick).click();
      await page.getByRole('button', { name: /^(Next post|See my result)$/ }).click();
    }
    await expect(page.getByRole('heading', { name: 'Spotting finished!' })).toBeVisible();
    await expect(page.locator('.tt-card--won')).toHaveCount(1);
    await expect(page.locator('.tt-card--won').getByRole('heading', { name: 'Dr. Fake' })).toBeVisible();
    await expect(page.getByText('1 of 5 cards collected')).toBeVisible();
    await checkScreen(page);
  });

  test('a miss gives a villain its hearts back, and the progress is saved between plays', async ({ page }) => {
    await openGame(page, { tacticStreaks: { dr_fake: 2 } });
    await start(page);
    for (let i = 1; i <= 12; i++) {
      await expect(page.getByText(`Post ${i} of 12`)).toBeVisible(); // wait for the next post, so currentPost never reads the old one
      const post = await currentPost(page);
      if (post.trick === 'dr_fake') {
        await pickButton(page, 'kwento_kim').click();
        await expect(page.getByText(/Dr\. Fake got the hearts back/)).toBeVisible();
        break;
      }
      await pickButton(page, post.trick).click();
      await page.getByRole('button', { name: 'Next post' }).click();
    }
    expect(await page.evaluate(() => window.localStorage.getItem('araw:v1:tacticStreaks'))).toContain('"dr_fake":0');
  });

  test('plays all twelve posts right, finishes with three stars and flows on into the module', async ({ page }) => {
    await openGame(page);
    await start(page);
    await playAll(page);
    await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();
    await expect(page.getByText('You made 12 right picks out of 12. 120 points.')).toBeVisible();
    await checkScreen(page);

    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await page.getByRole('button', { name: /^Next/ }).click();
    await expect(page.getByRole('heading', { name: 'Kailan ako magtitiwala?' })).toBeVisible();
    await page.getByRole('button', { name: /^Next: quick Fact or Fake round/ }).click();
    // module 4 ends with a ten-item Fact or Fake round
    await expect(page.getByRole('list', { name: 'Round progress' }).getByRole('listitem')).toHaveCount(10);
  });

  test('wrong picks still finish the game, with one star', async ({ page }) => {
    await openGame(page);
    await start(page);
    await playAll(page, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    await expect(page.getByRole('img', { name: '1 of 3 stars' }).first()).toBeVisible();
    await expect(page.getByText('You made 0 right picks out of 12. 0 points.')).toBeVisible();
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });
});
