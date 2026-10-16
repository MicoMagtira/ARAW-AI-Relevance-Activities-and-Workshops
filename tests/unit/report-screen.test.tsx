import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { location$, parseHash } from '../../src/app/router';
import { ReportView } from '../../src/screens/Report';

const ENDPOINT = 'https://script.google.com/macros/s/test/exec';

beforeEach(() => {
  location$.value = parseHash('#/report?screen=learn&item=m03-c2');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Report screen without a relay endpoint', () => {
  it('hides Send and offers Gmail, the email app, copy and the address', () => {
    render(<ReportView endpoint="" />);
    expect(screen.queryByRole('button', { name: 'Send report' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ways to send' })).toBeTruthy();
    const gmail = screen.getByRole('link', { name: /Open in Gmail/ });
    expect(gmail.getAttribute('href')).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=AIKasalig%40gmail\.com/);
    expect(gmail.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: 'Use my email app' }).getAttribute('href')).toMatch(/^mailto:AIKasalig@gmail\.com\?/);
    expect(screen.getByRole('button', { name: 'Copy report' })).toBeTruthy();
    expect(document.querySelector('.report-email')?.textContent).toBe('AIKasalig@gmail.com');
  });

  it('has a hidden honeypot field named website', () => {
    render(<ReportView endpoint="" />);
    const hp = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(hp?.tabIndex).toBe(-1);
    expect(hp?.getAttribute('autocomplete')).toBe('off');
    expect(hp?.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('shows the report in a selected box when the clipboard is blocked', async () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: navigator.userAgent, onLine: true, clipboard: { writeText: () => Promise.reject(new Error('blocked')) } });
    render(<ReportView endpoint="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    const box = (await screen.findByLabelText('Report text to copy')) as HTMLTextAreaElement;
    expect(box.readOnly).toBe(true);
    expect(box.value).toContain('Item: m03-c2');
    expect(screen.getByText(/press Ctrl\+C/)).toBeTruthy();
  });
});

describe('Report screen with a relay endpoint', () => {
  it('sends, shows Sending..., then the thank-you panel, and can start again', async () => {
    let answer: (r: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)));
    vi.stubGlobal('fetch', fetchMock);
    render(<ReportView endpoint={ENDPOINT} />);
    expect(screen.getByRole('heading', { name: 'Other ways to send' })).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Details (optional)'), { target: { value: 'Typo here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    const sending = await screen.findByRole('button', { name: 'Sending...' });
    expect((sending as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    answer(new Response(JSON.stringify({ ok: true })));

    const heading = await screen.findByRole('heading', { name: 'Report sent!' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('link', { name: 'Go home' }).getAttribute('href')).toBe('#/');
    fireEvent.click(screen.getByRole('button', { name: 'Report something else' }));
    expect((screen.getByLabelText('Details (optional)') as HTMLTextAreaElement).value).toBe('');
  });

  it('explains a failed send and keeps the fallbacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    render(<ReportView endpoint={ENDPOINT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText(/did not go through/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send report' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open in Gmail/ })).toBeTruthy();
  });
});
