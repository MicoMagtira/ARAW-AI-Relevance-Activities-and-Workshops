import { expect, test, type Page } from '@playwright/test';

interface AudioProbe {
  contexts: AudioContext[];
  oscillators: number;
}

const probe = () => (window as unknown as { __arawAudio: AudioProbe }).__arawAudio;

async function installProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state: AudioProbe = { contexts: [], oscillators: 0 };
    (window as unknown as { __arawAudio: AudioProbe }).__arawAudio = state;
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        state.contexts.push(this);
      }
      createOscillator(): OscillatorNode {
        state.oscillators++;
        return super.createOscillator();
      }
    };
  });
}

test.beforeEach(async ({ page }) => installProbe(page));

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

test.describe('permitted audio autoplay', () => {
  test('music starts on the language landing before any interaction', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#landing')).toBeVisible();
    await expect.poll(() => page.evaluate(probe).then((state) => state.oscillators)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __arawAudio: AudioProbe }).__arawAudio.contexts[0]?.state)).toBe('running');
  });
});

test.describe('blocked audio autoplay', () => {
  test('waits silently, then starts on a tap anywhere on the language landing', async ({ playwright, baseURL }, testInfo) => {
    const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=document-user-activation-required', '--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies'] });
    try {
      const { viewport, isMobile, hasTouch } = testInfo.project.use;
      const page = await browser.newPage({ baseURL, viewport, isMobile, hasTouch });
      await installProbe(page);
      await page.goto('/');
      await expect.poll(() => page.evaluate(() => (window as unknown as { __arawAudio: AudioProbe }).__arawAudio.contexts[0]?.state)).toBe('suspended');
      expect(await page.evaluate(probe).then((state) => state.oscillators)).toBe(0);
      await page.locator('.splash__wordmark').click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __arawAudio: AudioProbe }).__arawAudio.contexts[0]?.state)).toBe('running');
      await expect.poll(() => page.evaluate(probe).then((state) => state.oscillators)).toBeGreaterThan(0);
      await expect(page.locator('#landing')).toBeVisible();
    } finally {
      await browser.close();
    }
  });
});
