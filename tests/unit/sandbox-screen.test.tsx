// Chatbot Sandbox screen with the scripted test backend: load, chat, rate, and the red-flag, self-harm and privacy paths.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import type { FakeLlmOptions } from '../../src/sandbox/engine';

async function renderScreen(fake: FakeLlmOptions) {
  window.__ARAW_FAKE_LLM__ = { delay: 1, ...fake };
  vi.resetModules(); // a fresh engine per test (the app keeps one per model)
  const { xpClaims } = await import('../../src/app/progress');
  xpClaims.value = [];
  const { default: SandboxScreen } = await import('../../src/screens/sandbox/SandboxScreen');
  render(<SandboxScreen />);
  return { xpClaims };
}

async function ready() {
  return (await screen.findByLabelText('Your message', {}, { timeout: 3000 })) as HTMLTextAreaElement;
}

function type(input: HTMLTextAreaElement, text: string) {
  fireEvent.input(input, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

const log = () => screen.getByRole('log', { name: 'Chat with the practice AI' });

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  delete window.__ARAW_FAKE_LLM__;
});

describe('Chatbot Sandbox screen', () => {
  it('asks before downloading, then chats: the answer is labelled and can be rated', async () => {
    const { xpClaims } = await renderScreen({ reply: 'Keep water covered. {q}', delay: 60 });
    expect(await screen.findByText(/This happens only once/)).toBeTruthy(); // the download starts by itself
    expect(screen.queryByRole('button', { name: /Load/ })).toBeNull();
    const input = await ready();
    type(input, 'How do I stop mosquitoes?');
    await waitFor(() => expect(within(log()).getByText('Keep water covered. How do I stop mosquitoes?')).toBeTruthy());
    expect(within(log()).getByText('ARAW practice AI · can be wrong')).toBeTruthy();
    await waitFor(() => expect(xpClaims.value).toContain('sandbox:ask'));
    fireEvent.click(within(log()).getByRole('button', { name: 'Wrong: do not use it' }));
    expect(within(log()).getByText(/Good catch!/)).toBeTruthy();
    expect(screen.getByText(/1 of 5 missions done/)).toBeTruthy();
  });

  it('shows typing dots and a witty thinking line until the first words arrive', async () => {
    await renderScreen({ reply: 'Slow answer.', delay: 400 });
    const input = await ready();
    type(input, 'Hello?');
    const bubble = await waitFor(() => log().querySelector('.sb-typing') as HTMLElement);
    expect(bubble.querySelector('.sb-dots')).toBeTruthy();
    expect(bubble.querySelector('.sb-think')?.textContent?.length).toBeGreaterThan(5);
    expect(within(bubble).getByText('The practice AI is writing…')).toBeTruthy(); // the plain line for screen readers
    await waitFor(() => expect(within(log()).getByText(/Slow/)).toBeTruthy(), { timeout: 3000 });
    expect(log().querySelector('.sb-typing')).toBeNull();
  });

  it('hides a medicine dose in the answer and says why', async () => {
    await renderScreen({ reply: 'Rest well. Give 250 mg every 6 hours. See a health worker.' });
    const input = await ready();
    type(input, 'Fever medicine for my son?');
    await waitFor(() => expect(within(log()).getByText(/ARAW hid part of this answer/)).toBeTruthy());
    expect(log().textContent).not.toMatch(/250 mg/);
    expect(log().textContent).toMatch(/ARAW hid a medicine dose here/);
  });

  it('a red flag gets the "Magpatingin agad" card first; the model answers only if asked anyway', async () => {
    await renderScreen({ reply: 'General info.' });
    const input = await ready();
    type(input, 'My father has chest pain');
    expect(within(log()).getByRole('alert').textContent).toMatch(/call 911/);
    expect(within(log()).queryByText('General info.')).toBeNull();
    fireEvent.click(within(log()).getByRole('button', { name: 'Ask the practice AI anyway' }));
    await waitFor(() => expect(within(log()).getByText('General info.')).toBeTruthy());
  });

  it('thoughts of self-harm get the hotline and never reach the model', async () => {
    await renderScreen({ reply: 'MODEL ANSWER' });
    const input = await ready();
    type(input, 'I want to kill myself');
    expect(within(log()).getByRole('alert').textContent).toMatch(/1553/);
    expect(within(log()).queryByRole('button', { name: /anyway/ })).toBeNull();
    await new Promise((r) => setTimeout(r, 30));
    expect(log().textContent).not.toMatch(/MODEL ANSWER/);
  });

  it('personal details open the privacy nudge: edit keeps the text, send anyway sends it', async () => {
    await renderScreen({ reply: 'Okay.' });
    const input = await ready();
    type(input, 'My name is Juan and my number is 09171234567');
    const dialog = await screen.findByRole('dialog', { name: 'Wait: personal details?' });
    expect(within(dialog).getByText(/a phone number, a name/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit my message' }));
    expect(input.value).toMatch(/Juan/);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send anyway' }));
    await waitFor(() => expect(within(log()).getByText('Okay.')).toBeTruthy());
  });

  it('explains when the device cannot run the model and points to Module 3', async () => {
    await renderScreen({ unsupported: 'memory' });
    expect(await screen.findByText(/not have enough memory/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open Module 3/ }).getAttribute('href')).toBe('#/learn/m03');
  });

  it('a model already on the device opens straight away, and a failed load can be retried', async () => {
    await renderScreen({ cached: true });
    expect(await screen.findByLabelText('Your message', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText(/Downloading the practice AI/)).toBeNull();
    cleanup();
    await renderScreen({ failLoad: true });
    expect(await screen.findByText(/could not load/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeTruthy();
  });

  it('ticking a mission pays XP once', async () => {
    const { xpClaims } = await renderScreen({});
    fireEvent.click(screen.getByRole('button', { name: 'I did it: Ask what the date is today' }));
    expect(xpClaims.value).toContain('sandbox:date');
    expect(screen.queryByRole('button', { name: 'I did it: Ask what the date is today' })).toBeNull();
  });
});
