import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { Button, Meter, ProgressBar, Switch, SwitchRow, Tabs } from '../../src/ui/kit';

afterEach(cleanup);

describe('Button', () => {
  it('renders a link when href is given and a button otherwise', () => {
    render(
      <div>
        <Button href="#/learn">Go</Button>
        <Button onClick={() => {}}>Press</Button>
      </div>,
    );
    expect(screen.getByRole('link', { name: 'Go' }).getAttribute('href')).toBe('#/learn');
    expect(screen.getByRole('button', { name: 'Press' }).getAttribute('type')).toBe('button');
  });
});

describe('Switch', () => {
  it('toggles aria-checked through onChange', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Larger text" />);
    const sw = screen.getByRole('switch', { name: 'Larger text' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('SwitchRow shows ON/OFF text and is named by its label', () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <SwitchRow label="Reduce motion" hint="Fewer bounces" checked={on} onChange={setOn} />;
    }
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Reduce motion' });
    expect(screen.getByText('OFF')).toBeTruthy();
    fireEvent.click(sw);
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('ON')).toBeTruthy();
  });
});

describe('ProgressBar', () => {
  it('exposes progressbar semantics and a visible value', () => {
    render(<ProgressBar value={3} max={7} label="Module progress" text="3 / 7 cards" />);
    const bar = screen.getByRole('progressbar', { name: 'Module progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('7');
    expect(screen.getByText('3 / 7 cards')).toBeTruthy();
  });
});

describe('Meter', () => {
  it('lights the right number of segments and colours low values', () => {
    const { container } = render(<Meter value={30} label="Trust" />);
    expect(container.querySelectorAll('i.on')).toHaveLength(3);
    expect(container.querySelector('.px-meter--low')).not.toBeNull();
    expect(screen.getByText('Trust 30%')).toBeTruthy();
  });
});

describe('Tabs', () => {
  it('moves selection with arrow keys, Home and End', () => {
    function Harness() {
      const [v, setV] = useState<'a' | 'b' | 'c'>('a');
      return (
        <Tabs
          label="Sections"
          value={v}
          onChange={setV}
          items={[
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
            { id: 'c', label: 'C' },
          ]}
        />
      );
    }
    render(<Harness />);
    const selected = () => screen.getByRole('tab', { selected: true }).textContent;
    expect(selected()).toBe('A');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowRight' });
    expect(selected()).toBe('B');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'B' }), { key: 'End' });
    expect(selected()).toBe('C');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'C' }), { key: 'ArrowRight' });
    expect(selected()).toBe('A');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowLeft' });
    expect(selected()).toBe('C');
  });
});
