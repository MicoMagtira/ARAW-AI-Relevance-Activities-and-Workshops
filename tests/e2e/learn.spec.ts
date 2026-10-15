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
  await page.waitForFunction(() => document.querySelector('.lesson-card, .screen')?.getAnimations().every((a) => a.playState === 'finished') ?? false);
}

/** Press the runner's Next button (enabled once the card is done). */
async function next(page: Page, name: RegExp = /^Next/) {
  const button = page.getByRole('button', { name });
  await expect(button).toBeEnabled();
  await button.click();
}

async function openModule(page: Page, n: number, title: string) {
  await page.getByRole('button', { name: new RegExp(`^Module ${n}: ${title}`) }).click();
}

test.describe('Learn path', () => {
  test('shows ten modules on two roads: one current, nine locked', async ({ page }) => {
    await page.goto('/#/learn');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn');
    await expect(page.getByRole('heading', { level: 2, name: 'Your learning path' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Core modules' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'More modules' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Module \d+:/ })).toHaveCount(10);
    await expect(page.locator('.road-node--current')).toHaveCount(1);
    await expect(page.locator('.road-node--locked')).toHaveCount(9);
    await expect(page.locator('.road-node--current .ara')).toBeVisible();
    await expect(page.getByText('0 / 10 done')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('tapping a node shows its details; locked modules say what to finish first', async ({ page }, info) => {
    await page.goto('/#/learn');
    const wide = info.project.name === 'desktop';
    if (wide) await expect(page.getByRole('heading', { level: 3, name: 'What Is AI, Really?' })).toBeVisible();

    await openModule(page, 1, 'What Is AI, Really?');
    const details = wide ? page.locator('.learn__details') : page.getByRole('dialog');
    await expect(details.getByRole('heading', { level: 3, name: 'What Is AI, Really?' })).toBeVisible();
    await expect(details.getByText('AI or Not?')).toBeVisible();
    await expect(details.getByText('Unang Sinag')).toBeVisible();
    await expect(details.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '#/learn/m01');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    if (!wide) await page.getByRole('button', { name: 'Close' }).click();

    await openModule(page, 2, 'How AI Learns and Makes Mistakes');
    const second = wide ? page.locator('.learn__details') : page.getByRole('dialog');
    await expect(second.getByText('Finish Module 1 first.')).toBeVisible();
    await expect(second.getByRole('link', { name: /Start|Continue|Replay/ })).toHaveCount(0);
    if (!wide) {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  });

  test('a locked module cannot be opened by its link', async ({ page }) => {
    await page.goto('/#/learn/m03');
    await expect(page.getByRole('heading', { level: 2, name: 'This module is locked' })).toBeVisible();
    await expect(page.getByText('Finish Module 2 first.')).toBeVisible();
    await page.getByRole('link', { name: 'Back to the path' }).click();
    await expect(page).toHaveURL(/#\/learn$/);
  });
});

test.describe('Module runner', () => {
  test('completes the stub module: cards, game, takeaway, mini round, reward, unlocks', async ({ page }) => {
    await page.goto('/#/learn/m01');
    // focus mode: no sidebar, banner or tab bar, but a top bar with Close, progress and Report
    await expect(page.locator('.sidebar')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Close lesson/ })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 1 / 10');
    await expect(page.getByRole('link', { name: 'Report this card (m01-c1)' })).toHaveAttribute('href', /item=m01-c1/);
    await expect(page.getByText('Beta: educational, not medical advice')).toBeVisible();

    // 1 story hook (Enter moves on, like Next)
    await expect(page.getByText(/Is my phone listening to me/)).toBeVisible();
    await expect(page.locator('.lesson-ara .ara')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
    await page.keyboard.press('Enter');

    // 2 info
    await expect(page.getByRole('heading', { level: 2, name: /AI learns patterns/ })).toBeVisible();
    await next(page);

    // 3 reveal: Next waits until every tile was opened
    await expect(page.getByRole('button', { name: /^Next/ })).toBeDisabled();
    for (const label of ['Examples', 'Patterns', 'Guess']) await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page.getByText('3 of 3 revealed')).toBeVisible();
    await expect(page.getByText('An answer for something new.')).toBeVisible();
    await next(page);

    // 4 choice: a wrong answer explains, then the right one unlocks Next
    await page.getByRole('button', { name: /What mangoes taste like/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Muntik na!' })).toContainText('It only saw pictures');
    await expect(page.getByRole('button', { name: /^Next/ })).toBeDisabled();
    await page.getByRole('button', { name: /Patterns of shape and colour/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Tama!' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await next(page);

    // 5 swipe-sort with the bin buttons: calculator and switch are Not AI, spam filter and Maps are AI
    await expect(page.getByText('Pocket calculator')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const bin of ['Not AI', 'AI', 'Not AI', 'AI']) await page.getByRole('button', { name: bin, exact: true }).click();
    await expect(page.getByText('All sorted! 4 of 4 in the right bin.')).toBeVisible();
    await next(page);

    // 6 poll
    await page.getByRole('button', { name: /In a camera filter/ }).click();
    await expect(page.getByText(/There is no wrong answer/)).toBeVisible();
    await next(page);

    // 7 choice
    await page.getByRole('button', { name: /No\. Check if it is registered with the FDA/ }).click();
    await next(page);

    // module game (lazy loaded stub)
    await expect(page.getByRole('heading', { level: 2, name: 'AI or Not?' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 8 / 10');
    await page.getByRole('button', { name: 'Finish the game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
    await next(page);

    // takeaway
    await expect(page.getByRole('heading', { level: 2, name: 'Kailan ako magtitiwala?' })).toBeVisible();
    await expect(page.locator('.bullets li')).toHaveCount(3);
    await next(page, /^Next: quick Fact or Fake round/);

    // mini Fact or Fake: five practice items (fake, fact, fake, fact, fake)
    const truths = ['Fake', 'Fact', 'Fake', 'Fact', 'Fake'] as const;
    for (const [i, truth] of truths.entries()) {
      await expect(page.getByText(`Fact or Fake · ${i + 1} of 5`)).toBeVisible();
      await page.getByRole('button', { name: truth, exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Tama!' })).toBeVisible();
      if (truth === 'Fake') await expect(page.getByText('ARAW GAME · FAKE')).toBeVisible();
      await page.getByRole('button', { name: i === 4 ? 'See my reward' : 'Next' }).click();
    }

    // reward
    await expect(page.getByRole('heading', { level: 2, name: 'Galing! You finished the module.' })).toBeVisible();
    await expect(page.locator('.reward-badge__name')).toHaveText('Unang Sinag');
    await expect(page.getByText('+235 XP')).toBeVisible();
    await expect(page.getByText('Module 2 · How AI Learns and Makes Mistakes')).toBeVisible();
    await expect(page.getByText('Komiks Episode 1')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 10 / 10');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    // the path now has module 1 done and module 2 next up; Home shows the XP
    await page.getByRole('link', { name: 'Back to the path' }).click();
    await expect(page.getByText('1 / 10 done')).toBeVisible();
    await expect(page.locator('.road-node--done')).toHaveCount(1);
    await expect(page.locator('.road-node--current')).toContainText('How AI Learns');
    await page.goto('/#/');
    await expect(page.getByText('235', { exact: false }).first()).toBeVisible();

    // finished modules can be replayed without new XP
    await page.goto('/#/learn/m01');
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 1 / 10');
  });

  test('progress is saved after every card and resumes at the same card', async ({ page }) => {
    await page.goto('/#/learn/m01');
    await next(page); // story
    await next(page); // info
    await expect(page.getByRole('heading', { level: 2, name: 'Three parts of every AI guess' })).toBeVisible();
    await page.getByRole('link', { name: /^Close lesson/ }).click();
    await expect(page).toHaveURL(/#\/learn$/);
    await expect(page.getByRole('button', { name: /^Module 1:.*next up/ })).toBeVisible();

    await page.reload();
    await page.goto('/#/learn/m01');
    await expect(page.getByRole('heading', { level: 2, name: 'Three parts of every AI guess' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 3 / 10');
  });

  test('swipe-sort accepts a drag and the arrow keys', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 4 })));
    await page.goto('/#/learn/m01');
    await expect(page.getByText('Pocket calculator')).toBeVisible();
    await settled(page);
    const box = await page.locator('.sort-card').boundingBox();
    if (!box) throw new Error('sort card not visible');
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 160, y, { steps: 6 });
    await page.mouse.up();
    // the calculator is Not AI, so dragging it right is the wrong bin; the card moved on either way
    await expect(page.getByRole('status').filter({ hasText: 'Muntik na!' })).toContainText('Pocket calculator');
    await expect(page.getByText('Spam filter in your email')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status').filter({ hasText: 'Tama!' })).toBeVisible();
  });

  test('reduced motion shows a sparkle instead of confetti', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 7 }));
      window.localStorage.setItem('araw:v1:settings', JSON.stringify({ largeText: false, highContrast: false, xlButtons: false, srHints: false, reduceMotion: true }));
    });
    await page.goto('/#/learn/m01');
    await page.getByRole('button', { name: 'Finish the game' }).click();
    await next(page);
    await next(page, /^Next: quick Fact or Fake round/);
    for (const [i, truth] of (['Fake', 'Fact', 'Fake', 'Fact', 'Fake'] as const).entries()) {
      await page.getByRole('button', { name: truth, exact: true }).click();
      await page.getByRole('button', { name: i === 4 ? 'See my reward' : 'Next' }).click();
    }
    await expect(page.getByRole('heading', { level: 2, name: 'Galing! You finished the module.' })).toBeVisible();
    await expect(page.locator('.confetti-sparkle')).toBeVisible();
    await expect(page.locator('canvas.confetti')).toHaveCount(0);
  });

  test('every setting on: the runner still fits and stays accessible', async ({ page }) => {
    await page.goto('/#/me');
    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await page.getByRole('switch', { name }).click();
    }
    await page.goto('/#/learn/m01');
    await next(page);
    await next(page);
    for (const label of ['Examples', 'Patterns', 'Guess']) await page.getByRole('button', { name: new RegExp(label) }).click();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.goto('/#/learn');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });
});
