// Chatbot Sandbox screen with the scripted test backend: load, chat, rate, and the red-flag, self-harm and privacy paths.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import type { FakeLlmOptions } from '../../src/sandbox/engine';

async function renderScreen(fake: FakeLlmOptions, agreed = true) {
  window.__ARAW_FAKE_LLM__ = { delay: 1, ...fake };
  if (agreed) window.localStorage.setItem('araw:v1:sandbox-terms', '1');
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

describe('Chatbot Sandbox terms', () => {
  it('shows the terms first and starts nothing until the player agrees', async () => {
    await renderScreen({ reply: 'Okay.' }, false);
    expect(screen.getByRole('heading', { name: 'Before you chat' })).toBeTruthy();
    expect(screen.getByText(/Do not share personal details/)).toBeTruthy();
    expect(screen.getByText(/sent over the internet to an AI service/)).toBeTruthy();
    expect(screen.queryByLabelText('Your message')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));
    await ready();
    expect(window.localStorage.getItem('araw:v1:sandbox-terms')).toBe('1');
  });

  it('Not now keeps the chat closed, with a way back to the terms and to Module 3', async () => {
    await renderScreen({ reply: 'Okay.' }, false);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByText(/please read and agree to the terms first/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open Module 3/ })).toBeTruthy();
    expect(screen.queryByLabelText('Your message')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Read the terms' }));
    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));
    await ready();
  });

  it('asks again when the terms change', async () => {
    window.localStorage.setItem('araw:v1:sandbox-terms', '0');
    await renderScreen({}, false);
    expect(screen.getByRole('button', { name: 'I agree' })).toBeTruthy();
  });

  it('on-device mode downloads nothing before the player agrees', async () => {
    await renderScreen({ device: true, delay: 60 }, false);
    expect(screen.queryByText(/This happens only once/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));
    expect(await screen.findByText(/This happens only once/)).toBeTruthy();
  });
});

describe('Ara caught this', () => {
  const tip = () => document.querySelector('.sb-catch');

  it('explains why the AI does not know the date, and finishes the date mission', async () => {
    const { xpClaims } = await renderScreen({ reply: 'I do not know the date.' });
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'What is the date today?' }));
    await waitFor(() => expect(tip()?.textContent).toContain('AI has no clock'));
    expect(tip()?.textContent).toContain('Ara caught this:');
    await waitFor(() => expect(xpClaims.value).toContain('sandbox:date'));
  });

  it('warns about a link in an answer and finishes the source mission', async () => {
    const { xpClaims } = await renderScreen({ reply: 'Read www.example.org for the study.' });
    type(await ready(), 'Tell me more');
    await waitFor(() => expect(tip()?.textContent).toContain('This link may not be real'));
    await waitFor(() => expect(xpClaims.value).toContain('sandbox:source'));
  });

  it('catches a promise the AI cannot make', async () => {
    await renderScreen({ reply: 'Huwag mag-alala, gagaling ka rin!' });
    type(await ready(), 'Tatlong linggo na akong inuubo');
    await waitFor(() => expect(tip()?.textContent).toContain('it cannot promise you will be okay'));
  });

  it('stays quiet on an ordinary answer, and does not appear until the answer is done', async () => {
    await renderScreen({ reply: 'Keep water covered and clean.', delay: 30 });
    type(await ready(), 'How do I stop mosquitoes?');
    expect(tip()).toBeNull();
    await waitFor(() => expect(within(log()).getByRole('group', { name: 'Would you trust this answer?' })).toBeTruthy());
    expect(tip()).toBeNull();
  });
});

describe('when the server cannot answer', () => {
  it('says the AI is resting until 8 AM, and the on-device AI is the player\'s own choice', async () => {
    await renderScreen({ cloudError: 'quota', reply: 'Device answer.', delay: 60 });
    type(await ready(), 'Hello');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('The practice AI is resting')).toBeTruthy();
    expect(within(alert).getByText(/8:00 AM, Philippine time/)).toBeTruthy();
    expect(within(alert).getByText(/378 MB, one time/)).toBeTruthy();
    expect(within(alert).getByRole('link', { name: /Open Module 3/ })).toBeTruthy();
    expect(screen.queryByText(/This happens only once/)).toBeNull(); // nothing downloads by itself
    fireEvent.click(within(alert).getByRole('button', { name: 'Save the AI on this device' }));
    expect(await screen.findByText(/This happens only once/)).toBeTruthy();
    const input = await ready();
    expect(screen.getByText(/Your chat stays on this device/)).toBeTruthy(); // the wording follows where the AI runs
    type(input, 'Hello again');
    await waitFor(() => expect(within(log()).getByText('Device answer.')).toBeTruthy());
  });

  it('says it is busy, and the chat can simply be tried again', async () => {
    await renderScreen({ cloudError: 'busy' });
    type(await ready(), 'Hello');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('The practice AI cannot answer right now')).toBeTruthy();
    expect(within(log()).getByText('The practice AI could not answer this time.')).toBeTruthy();
    expect(screen.getByLabelText('Your message')).toBeTruthy();
  });

  it('tells the truth about where messages go while the AI is on the server', async () => {
    await renderScreen({ reply: 'Okay.' });
    await ready();
    expect(screen.getByText(/Your messages go over the internet to an AI service/)).toBeTruthy();
    expect(screen.queryByText(/Your chat stays on this device/)).toBeNull();
    expect(screen.getByText(/It runs on Cloudflare Workers AI/)).toBeTruthy();
    expect(screen.getByText(/built for Southeast Asia\. It sounds sure/)).toBeTruthy();
    expect(screen.queryByText(/This AI is small/)).toBeNull();
  });
});

describe('Chatbot Sandbox screen', () => {
  it('chats with nothing to download: the answer is labelled and can be rated', async () => {
    const { xpClaims } = await renderScreen({ reply: 'Keep water covered. {q}', delay: 60 });
    const input = await ready();
    expect(screen.queryByText(/This happens only once/)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
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
    await renderScreen({ device: true, unsupported: 'memory' });
    expect(await screen.findByText(/not have enough memory/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open Module 3/ }).getAttribute('href')).toBe('#/learn/m03');
  });

  it('a model already on the device opens straight away, and a failed load can be retried', async () => {
    await renderScreen({ device: true, cached: true });
    expect(await screen.findByLabelText('Your message', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText(/Downloading the practice AI/)).toBeNull();
    cleanup();
    await renderScreen({ device: true, failLoad: true });
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
