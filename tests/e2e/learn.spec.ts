import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { playAiOrNot } from './aon';
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
  test('completes module 1: cards, game, takeaway, mini round, reward, unlocks', async ({ page }) => {
    await page.goto('/#/learn/m01');
    // focus mode: no sidebar, banner or tab bar, but a top bar with Close, progress and Report
    await expect(page.locator('.sidebar')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Close lesson/ })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 1 / 12');
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

    // 5 reveal: six AI examples
    await expect(page.getByRole('heading', { level: 2, name: 'AI you already use' })).toBeVisible();
    for (const label of ['Social media feed', 'Face filter', 'Maps traffic', 'Spam filter', 'Voice assistant', 'Symptom checker']) {
      await page.getByRole('button', { name: new RegExp(label) }).click();
    }
    await expect(page.getByText('6 of 6 revealed')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await next(page);

    // 6 choice: Maps says 20 minutes
    await page.getByRole('button', { name: /A promise: the app knows the future/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Muntik na!' })).toContainText('Nobody knows the future');
    await page.getByRole('button', { name: /A guess from patterns in past traffic/ }).click();
    await next(page);

    // 7 reveal: AI in health, people decide
    await expect(page.getByRole('heading', { level: 2, name: /AI in health/ })).toBeVisible();
    for (const label of ['X-ray helpers', 'Health chatbots', 'Appointment systems', 'Claims-fraud flags']) {
      await page.getByRole('button', { name: new RegExp(label) }).click();
    }
    await next(page);

    // 8 choice: the "AI-powered" sticker
    await page.getByRole('button', { name: /No\. Check if it is registered with the FDA/ }).click();
    await next(page);

    // 9 poll
    await page.getByRole('button', { name: /In a camera filter/ }).click();
    await expect(page.getByText(/There is no wrong answer/)).toBeVisible();
    await next(page);

    // module game (lazy loaded AI or Not?)
    await expect(page.getByRole('heading', { level: 2, name: 'AI or Not?' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 10 / 12');
    await playAiOrNot(page);
    await page.getByRole('button', { name: /Finish game/ }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
    await next(page);

    // takeaway
    await expect(page.getByRole('heading', { level: 2, name: 'Kailan ako magtitiwala?' })).toBeVisible();
    await expect(page.locator('.bullets li')).toHaveCount(3);
    await next(page, /^Next: quick Fact or Fake round/);

    // mini Fact or Fake: five balanced practice items in random order; answer Fake every time.
    // A right answer (the item was a fake) shows Tama! and the FAKE stamp; otherwise Muntik na!.
    let right = 0;
    for (let i = 0; i < 5; i++) {
      await expect(page.getByText(`Fact or Fake · ${i + 1} of 5`)).toBeVisible();
      await page.getByRole('button', { name: 'Fake', exact: true }).click();
      const feedback = page.getByRole('status').filter({ hasText: /Tama!|Muntik na!/ });
      await expect(feedback).toBeVisible();
      const correct = /Tama!/.test((await feedback.textContent()) ?? '');
      if (correct) right++;
      await expect(page.getByText('ARAW GAME · FAKE')).toHaveCount(correct ? 1 : 0);
      await page.getByRole('button', { name: i === 4 ? 'See my reward' : 'Next' }).click();
    }
    expect(right).toBeGreaterThanOrEqual(2); // 2 or 3 of the five are fakes

    // reward
    await expect(page.getByRole('heading', { level: 2, name: 'Galing! You finished the module.' })).toBeVisible();
    await expect(page.locator('.reward-badge__name')).toHaveText('Unang Sinag');
    await expect(page.getByText(`+${195 + right * 10} XP`)).toBeVisible();
    await expect(page.getByText('Module 2 · How AI Learns and Makes Mistakes')).toBeVisible();
    await expect(page.getByText('Komiks Episode 1')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 12 / 12');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    // the path now has module 1 done and module 2 next up; Home shows the XP
    await page.getByRole('link', { name: 'Back to the path' }).click();
    await expect(page.getByText('1 / 10 done')).toBeVisible();
    await expect(page.locator('.road-node--done')).toHaveCount(1);
    await expect(page.locator('.road-node--current')).toContainText('How AI Learns');
    await page.goto('/#/');
    await expect(page.getByText(String(195 + right * 10), { exact: false }).first()).toBeVisible();

    // finished modules can be replayed without new XP
    await page.goto('/#/learn/m01');
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 1 / 12');
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
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuetext', 'Step 3 / 12');
  });

  test('reduced motion shows a sparkle instead of confetti', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9 }));
      window.localStorage.setItem('araw:v1:settings', JSON.stringify({ largeText: false, highContrast: false, xlButtons: false, srHints: false, reduceMotion: true }));
    });
    await page.goto('/#/learn/m01');
    await playAiOrNot(page);
    await page.getByRole('button', { name: /Finish game/ }).click();
    await next(page);
    await next(page, /^Next: quick Fact or Fake round/);
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Fake', exact: true }).click();
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
