// Pixel confetti overlay: a pointer-events-none canvas. Reduced motion shows a static sparkle instead.
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';
import { useReducedMotion } from './Ara';
import { CONFETTI_COLOURS, CONFETTI_MS, makeParticles, stepParticle, type Particle } from './confettiPhysics';

export function Confetti({ count = 60 }: { count?: number }) {
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (reduced || !el) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = el.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const g = ctx;
    const w = (el.width = el.clientWidth);
    const h = (el.height = el.clientHeight);
    const style = getComputedStyle(document.documentElement);
    const colours = CONFETTI_COLOURS.map((name) => style.getPropertyValue(name).trim() || 'currentColor');
    let particles: Particle[] = makeParticles(count, w);
    let last = performance.now();
    const began = last;
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      particles = particles.map((p) => stepParticle(p, dt));
      g.clearRect(0, 0, w, h);
      for (const p of particles) {
        g.fillStyle = colours[p.colour] ?? 'currentColor';
        g.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, p.size, p.size);
      }
      if (now - began < CONFETTI_MS) raf = requestAnimationFrame(frame);
      else g.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, count]);

  if (reduced) {
    return (
      <span class="confetti-sparkle" aria-hidden="true">
        <Icon name="xp-star" size={48} />
      </span>
    );
  }
  return <canvas ref={canvas} class="confetti" aria-hidden="true" />;
}
