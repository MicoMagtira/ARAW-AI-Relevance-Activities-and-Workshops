// Small pixel UI kit (docs/DESIGN.md section 5). Styles live in src/styles/base.css.
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentChildren, CSSProperties } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';
import { t } from '../app/i18n';
import { settings } from '../app/settings';
import { Icon } from './Icon';

const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');

/* ---------- Panel ---------- */
interface PanelProps {
  children: ComponentChildren;
  class?: string;
  as?: 'section' | 'div' | 'article';
  'aria-labelledby'?: string;
}
export function Panel({ children, class: className, as: Tag = 'section', ...rest }: PanelProps) {
  return (
    <Tag class={cx('px-box px-panel', className)} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Button (renders <a> when href is given) ---------- */
type Variant = 'primary' | 'secondary' | 'gold' | 'fact' | 'fake';
interface ButtonBase {
  variant?: Variant;
  large?: boolean;
  icon?: boolean;
  class?: string;
  children: ComponentChildren;
}
type ButtonProps = ButtonBase & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'icon'> & { href?: undefined };
type LinkProps = ButtonBase & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'icon' | 'role'> & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', large, icon, class: className, children, ...rest } = props;
  const cls = cx('px-btn px-notch', variant !== 'primary' && `px-btn--${variant}`, large && 'px-btn--lg', icon && 'px-btn--icon', className);
  if (props.href !== undefined) {
    const { href, ...anchor } = rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'role'>;
    return (
      <a {...anchor} href={href as string} class={cls}>
        {children}
      </a>
    );
  }
  const { type = 'button', ...btn } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...btn} type={type} class={cls}>
      {children}
    </button>
  );
}

/* ---------- Chip ---------- */
interface ChipProps {
  kind?: 'xp' | 'streak' | 'fact' | 'fake';
  children: ComponentChildren;
  class?: string;
  'aria-label'?: string;
}
export function Chip({ kind, children, class: className, ...rest }: ChipProps) {
  return (
    <span class={cx('px-chip px-notch', kind && `px-chip--${kind}`, className)} {...rest}>
      {children}
    </span>
  );
}

/* ---------- Switch + settings row ---------- */
interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
  id?: string;
}
export function Switch({ checked, onChange, ...aria }: SwitchProps) {
  return (
    <button type="button" class="px-switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} {...aria}>
      <span class="px-switch__knob" />
    </button>
  );
}

interface SwitchRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Extra text that is only rendered with Screen-reader hints on. */
  srHint?: string;
}
/** One tap target: label + hint + switch + ON/OFF word (state never depends on colour). */
export function SwitchRow({ label, hint, checked, onChange, srHint: srHintText }: SwitchRowProps) {
  const id = useId();
  const srHint = settings.value.srHints ? srHintText : undefined;
  return (
    <label class="setting-row">
      <span class="setting-row__text">
        <span class="setting-row__label" id={`${id}-l`}>
          {label}
        </span>
        <span class="setting-row__hint" id={`${id}-h`}>
          {hint}
        </span>
        {srHint && (
          <span class="sr-hint" id={`${id}-s`}>
            {srHint}
          </span>
        )}
      </span>
      <span class="setting-row__state" aria-hidden="true">
        {checked ? t('setting.on') : t('setting.off')}
      </span>
      <Switch checked={checked} onChange={onChange} aria-labelledby={`${id}-l`} aria-describedby={srHint ? `${id}-h ${id}-s` : `${id}-h`} />
    </label>
  );
}

/* ---------- Progress (barber pole) and segmented meter ---------- */
interface ProgressProps {
  value: number;
  max: number;
  /** Visible text value, e.g. "3 / 7 cards". */
  text: string;
  label: string;
}
export function ProgressBar({ value, max, text, label }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const stepped = Math.round(pct / 5) * 5; // 5% steps keep the pixel look
  return (
    <div class="px-progress-wrap">
      <div class="px-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={text}>
        <div class="px-progress__fill" style={{ '--value': `${stepped}%` } as CSSProperties} />
      </div>
      <span class="px-progress__text">{text}</span>
    </div>
  );
}

interface MeterProps {
  /** 0 to 100. */
  value: number;
  label: string;
  segments?: number;
}
export function Meter({ value, label, segments = 10 }: MeterProps) {
  const on = Math.round((Math.min(100, Math.max(0, value)) / 100) * segments);
  const tone = value <= 30 ? 'low' : value <= 60 ? 'mid' : 'high';
  return (
    <div class="px-meter-wrap">
      <span class="px-meter-wrap__label">{`${label} ${Math.round(value)}%`}</span>
      <div class={`px-meter px-meter--${tone}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} style={{ '--segments': segments } as CSSProperties}>
        {Array.from({ length: segments }, (_, i) => (
          <i key={i} class={i < on ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Tabs (segmented, arrow keys) ---------- */
interface TabsProps<T extends string> {
  items: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}
export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (index: number) => {
    const next = (index + items.length) % items.length;
    const item = items[next];
    if (!item) return;
    onChange(item.id);
    refs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight') move(i + 1);
    else if (e.key === 'ArrowLeft') move(i - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div class="px-tabs px-notch" role="tablist" aria-label={label}>
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          class="px-tab"
          aria-selected={item.id === value}
          tabIndex={item.id === value ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Dialog (native <dialog>: focus trap, Esc, focus return) ---------- */
interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  actions?: ComponentChildren;
}
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);
  return (
    <dialog ref={ref} class="px-dialog px-box" aria-labelledby={titleId} onClose={onClose}>
      <div class="px-dialog__bar">
        <h2 class="px-dialog__title" id={titleId}>
          {title}
        </h2>
        <Button icon variant="secondary" aria-label={t('dialog.close')} onClick={onClose}>
          <Icon name="close" />
        </Button>
      </div>
      <div class="px-dialog__body">{children}</div>
      {actions && <div class="px-dialog__actions">{actions}</div>}
    </dialog>
  );
}

/* ---------- Toasts ---------- */
export interface Toast {
  id: number;
  title: string;
  text?: string;
  kind: 'xp' | 'badge' | 'success';
}
export const toasts = signal<Toast[]>([]);
let toastId = 0;

export function pushToast(toast: Omit<Toast, 'id'>): void {
  toasts.value = [...toasts.value, { ...toast, id: ++toastId }].slice(-3);
}
export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((x) => x.id !== id);
}

function ToastItem({ toast }: { toast: Toast }) {
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => dismissToast(toast.id), 4000);
  };
  const pause = () => window.clearTimeout(timer.current);
  useEffect(() => {
    start();
    return pause;
  }, []);
  return (
    <div class="px-toast px-box" onMouseEnter={pause} onMouseLeave={start} onFocusIn={pause} onFocusOut={start}>
      <span class={`px-toast__tile px-toast__tile--${toast.kind}`}>
        <Icon name={toast.kind === 'xp' ? 'xp-star' : toast.kind === 'badge' ? 'trophy' : 'check'} size={24} />
      </span>
      <div class="px-toast__body">
        <p class="px-toast__title">{toast.title}</p>
        {toast.text && <p class="px-toast__text">{toast.text}</p>}
      </div>
      <Button icon variant="secondary" aria-label={t('toast.close')} onClick={() => dismissToast(toast.id)}>
        <Icon name="close" />
      </Button>
    </div>
  );
}

/** Always mounted so screen readers pick up new messages. */
export function ToastHost() {
  return (
    <div class="px-toasts" role="status" aria-live="polite">
      {toasts.value.map((x) => (
        <ToastItem key={x.id} toast={x} />
      ))}
    </div>
  );
}

/* ---------- Speech bubble, stamp, watermark ---------- */
export function Bubble({ children, live }: { children: ComponentChildren; live?: boolean }) {
  return (
    <div class="px-bubble px-box" aria-live={live ? 'polite' : undefined}>
      <svg class="px-bubble__tail" width="12" height="12" viewBox="0 0 3 3" shape-rendering="crispEdges" aria-hidden="true">
        <path fill="var(--ink)" d="M1 0h1v1H1zM0 1h1v1H0zM1 2h1v1H1z" />
        <path fill="var(--surface)" d="M2 0h1v3H2zM1 1h1v1H1z" />
      </svg>
      {children}
    </div>
  );
}

/** Reveal stamp for generated fakes. */
export function Stamp({ children = 'ARAW GAME · FAKE' }: { children?: ComponentChildren }) {
  return <span class="px-stamp">{children}</span>;
}

export function Watermark() {
  return (
    <span class="px-watermark" aria-hidden="true">
      ARAW GAME
    </span>
  );
}

/** Extra description that is only exposed when "Screen-reader hints" is on. */
export function SrHint({ children, id }: { children: ComponentChildren; id?: string }) {
  return settings.value.srHints ? (
    <span class="sr-hint" id={id}>
      {children}
    </span>
  ) : null;
}

/** `aria-describedby` value for an <SrHint id>: only set while Screen-reader hints is on. */
export const srDescribedBy = (id: string): string | undefined => (settings.value.srHints ? id : undefined);
