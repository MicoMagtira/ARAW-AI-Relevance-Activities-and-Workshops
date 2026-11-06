// Chatbot Sandbox (#/sandbox) with the scripted test backend (window.__ARAW_FAKE_LLM__): nothing is downloaded, and any
// request to Hugging Face fails the test. Every state must fit the screen and pass axe at phone, tablet and desktop.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { FakeLlmOptions } from '../../src/sandbox/engine';
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

async function check(page: Page) {
  await settled(page);
  await noHorizontalOverflow(page);
  expect(await axeSerious(page)).toEqual([]);
}

/** Undo the fixture's agreement, so the sandbox opens on its terms pop-up. */
async function notAgreed(page: Page) {
  await page.addInitScript(() => window.localStorage.removeItem('araw:v1:sandbox-terms'));
}

async function open(page: Page, fake: FakeLlmOptions = {}) {
  await page.route('**/huggingface.co/**', (route) => {
    throw new Error(`unexpected model download: ${route.request().url()}`);
  });
  await page.addInitScript((opts) => {
    window.__ARAW_FAKE_LLM__ = opts;
  }, { delay: 10, ...fake });
  await page.goto('/#/sandbox');
}

/** Wait until the chat is ready. */
async function loadModel(page: Page) {
  await expect(page.getByLabel('Your message')).toBeVisible({ timeout: 15_000 });
}

const log = (page: Page) => page.getByRole('log', { name: 'Chat with the practice AI' });

test.describe('Chatbot Sandbox', () => {
  test('opens straight into the chat with nothing to download, and tells the truth about where messages go', async ({ page }) => {
    await open(page);
    await loadModel(page);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByText(/This happens only once/)).toHaveCount(0);
    await expect(page.getByText(/Your messages go over the internet to an AI service/)).toBeVisible();
    await expect(page.getByText(/Your chat stays on this device/)).toHaveCount(0);
    await check(page);
  });

  test('the terms come first: Not now keeps the chat closed, I agree opens it and is remembered', async ({ page }) => {
    await notAgreed(page);
    await open(page);
    const terms = page.getByRole('dialog', { name: 'Before you chat' });
    await expect(terms).toBeVisible();
    await expect(terms.getByText(/Do not share personal details/)).toBeVisible();
    await expect(terms.getByRole('button', { name: 'I agree' })).toBeInViewport({ ratio: 1 }); // never hidden below the fold
    await expect(terms.getByRole('button', { name: 'Not now' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByLabel('Your message')).toHaveCount(0);
    await check(page);
    await terms.getByRole('button', { name: 'Not now' }).click();
    await expect(terms).toBeHidden();
    await expect(page.getByLabel('Your message')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Module 3' })).toHaveAttribute('href', '#/learn/m03');
    await check(page);
    await page.getByRole('button', { name: 'Read the terms' }).click();
    await terms.getByRole('button', { name: 'I agree' }).click();
    await loadModel(page);
    expect(await page.evaluate(() => window.localStorage.getItem('araw:v1:sandbox-terms'))).toBe('1');
  });

  test('when the free chats run out it says so, and saving the AI on the device is the player\'s choice', async ({ page }) => {
    await open(page, { cloudError: 'quota', reply: 'A device answer.', delay: 400 });
    await loadModel(page);
    await page.getByRole('button', { name: 'What is the date today?' }).click();
    const card = page.getByRole('alert').filter({ hasText: 'The practice AI is resting' });
    await expect(card).toBeVisible();
    await expect(card.getByText(/8:00 AM, Philippine time/)).toBeVisible();
    await expect(card.getByRole('link', { name: 'Open Module 3' })).toHaveAttribute('href', '#/learn/m03');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await check(page);
    await card.getByRole('button', { name: 'Save the AI on this device' }).click();
    await expect(page.getByRole('progressbar', { name: 'Downloading the practice AI' })).toBeVisible();
    await loadModel(page);
    await expect(page.getByText(/Your chat stays on this device/)).toBeVisible();
  });

  test('the terms buttons stay on screen on the smallest phone, in the longest language', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    await notAgreed(page);
    await page.addInitScript(() => window.localStorage.setItem('araw:v1:language', JSON.stringify('hil')));
    await page.setViewportSize({ width: 320, height: 568 });
    await open(page);
    const agree = page.getByRole('button', { name: 'Nagasugot ako' });
    await expect(agree).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Indi anay' })).toBeInViewport({ ratio: 1 });
    await noHorizontalOverflow(page);
  });

  test('the on-device AI downloads with a progress bar, then shows the chat; both states fit and are accessible', async ({ page }) => {
    await open(page, { device: true, delay: 1500 });
    await expect(page.getByRole('heading', { name: 'Downloading the practice AI' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Downloading the practice AI' })).toBeVisible();
    await expect(page.getByText(/This happens only once/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Load/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Catch the AI' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'When should I trust it?' })).toBeVisible();
    await check(page);
    await loadModel(page);
    await expect(page.getByRole('list', { name: 'Try asking' }).getByRole('button')).toHaveCount(6);
    await check(page);
  });

  test('a starter question streams an answer that is labelled, can be rated, and pays the first mission', async ({ page }) => {
    await open(page, { reply: 'A practice answer. {q}' });
    await loadModel(page);
    await page.getByRole('button', { name: 'What does a vaccine do? Explain in simple words.' }).click();
    await expect(log(page).getByText('A practice answer. What does a vaccine do? Explain in simple words.')).toBeVisible();
    await expect(log(page).getByText('ARAW practice AI · can be wrong')).toBeVisible();
    await log(page).getByRole('button', { name: 'Get checked: see a health worker' }).click();
    await expect(log(page).getByText(/a health worker decides/)).toBeVisible();
    await expect(page.getByText('1 of 5 missions done')).toBeVisible();
    await check(page);
  });

  test('Stop ends a long answer, and Clear chat empties the log', async ({ page }) => {
    await open(page, { reply: 'word '.repeat(200), delay: 40 });
    await loadModel(page);
    await page.getByLabel('Your message').fill('Tell me a long story');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(log(page).getByText('You stopped this answer.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear chat' }).click();
    await expect(log(page).getByText(/No messages yet/)).toBeVisible();
  });

  test('a red flag shows the "Magpatingin agad" card before any answer', async ({ page }) => {
    await open(page, { reply: 'General information only.' });
    await loadModel(page);
    await page.getByLabel('Your message').fill('Nahimatay ang lola ko');
    await page.keyboard.press('Enter');
    await expect(log(page).getByRole('alert')).toContainText('call 911');
    await expect(log(page).getByText('General information only.')).toHaveCount(0);
    await check(page);
    await log(page).getByRole('button', { name: 'Ask the practice AI anyway' }).click();
    await expect(log(page).getByText('General information only.')).toBeVisible();
  });

  test('personal details open the privacy nudge', async ({ page }) => {
    await open(page, { reply: 'Okay.' });
    await loadModel(page);
    await page.getByLabel('Your message').fill('My PhilHealth number is 12-345678901-2');
    await page.getByRole('button', { name: 'Send' }).click();
    const dialog = page.getByRole('dialog', { name: 'Wait: personal details?' });
    await expect(dialog).toContainText('an ID number');
    await check(page);
    await dialog.getByRole('button', { name: 'Send anyway' }).click();
    await expect(log(page).getByText('Okay.')).toBeVisible();
  });

  test('a device that cannot run the model gets a kind explanation and a way to Module 3', async ({ page }) => {
    await open(page, { device: true, unsupported: 'browser' });
    await expect(page.getByRole('heading', { name: 'This device cannot run the practice AI' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Module 3' })).toHaveAttribute('href', '#/learn/m03');
    await check(page);
  });

  test('the Arcade links to the sandbox', async ({ page }) => {
    await open(page);
    await page.goto('/#/arcade');
    await page.getByRole('link', { name: 'Open the sandbox' }).click();
    await expect(page).toHaveURL(/#\/sandbox$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chatbot Sandbox' })).toBeVisible();
  });

  test('fits from 320px to 1920px with the chat open', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewports');
    await open(page, { cached: true, reply: 'A fairly long practice answer that should wrap nicely inside the bubble at every width.' });
    await expect(page.getByLabel('Your message')).toBeVisible();
    await page.getByRole('button', { name: 'What is the date today?' }).click();
    await expect(log(page).getByText(/fairly long practice answer/)).toBeVisible();
    for (const [width, height] of [[320, 640], [414, 896], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]] as const) {
      await page.setViewportSize({ width, height });
      await noHorizontalOverflow(page);
    }
  });
});
