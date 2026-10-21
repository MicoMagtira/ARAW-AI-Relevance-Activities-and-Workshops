// Applies the active language pack to everything on screen without touching each component:
//  - a Preact vnode hook translates string children and text attributes (alt, aria-label, title, placeholder...) as
//    elements are created, so content arrays (myths, items, lessons) render translated straight from their English source;
//  - the canvas text calls are wrapped, so games that draw words on a canvas are translated too.
// t() in src/app/i18n.ts translates UI strings itself; a second lookup of an already translated string simply misses.
import { options, type VNode } from 'preact';
import { activeLanguage, tx } from './runtime';

const ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'aria-valuetext', 'aria-roledescription', 'aria-description'] as const;

const fix = (c: unknown): unknown => (typeof c === 'string' ? tx(c) : Array.isArray(c) ? c.map(fix) : c);

let installed = false;

export function installTranslation(): void {
  if (installed) return;
  installed = true;

  const prev = options.vnode;
  options.vnode = (vnode: VNode) => {
    if (activeLanguage() !== 'en' && vnode.props && typeof vnode.props === 'object') {
      const p = vnode.props as Record<string, unknown>;
      // data-no-tx: text the player typed or an AI wrote (Chatbot Sandbox) is shown exactly as it is
      if ('children' in p && !p['data-no-tx']) p.children = fix(p.children);
      if (typeof vnode.type === 'string') for (const a of ATTRS) if (typeof p[a] === 'string') p[a] = tx(p[a] as string);
    }
    prev?.(vnode);
  };

  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const proto = CanvasRenderingContext2D.prototype;
    for (const name of ['fillText', 'strokeText', 'measureText'] as const) {
      const orig = proto[name] as (this: CanvasRenderingContext2D, text: string, ...rest: number[]) => unknown;
      (proto as unknown as Record<string, unknown>)[name] = function (this: CanvasRenderingContext2D, text: string, ...rest: number[]) {
        return orig.call(this, activeLanguage() === 'en' || typeof text !== 'string' ? text : tx(text), ...rest);
      };
    }
  }
}
