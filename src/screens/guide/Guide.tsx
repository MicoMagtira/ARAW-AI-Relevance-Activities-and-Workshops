// "How to use ARAW": the illustrated user guide. Content: src/content/guide.ts. Screenshots and callout boxes come from the
// capture pipeline (scripts/guide/capture.spec.ts -> public/guide/*.png + scripts/guide/out/manifest.json).
// Phone screenshots show below 1024px and desktop ones from 1024px; the hidden one is display:none, so a lazy image never loads.
// In-page jumps use buttons, not #anchors: the hash belongs to the router.
import { useRef } from 'preact/hooks';
import manifestJson from '../../../scripts/guide/out/manifest.json';
import { GUIDE_META, GUIDE_SECTIONS, type GuideSection, type GuideStep } from '../../content/guide';
import { Button, Panel } from '../../ui/kit';
import { placeCallouts, type GuideManifest, type ShotEntry, type ShotVariant } from './callouts';
import '../../styles/guide.css';

const MANIFEST = manifestJson as unknown as GuideManifest;

/** Marker size in screenshot pixels: phone shots show near 1:1, desktop shots at about half size. */
const MARKER: Record<ShotVariant, number> = { phone: 32, desktop: 52 };

function jumpTo(id: string): void {
  const heading = document.getElementById(`guide-${id}-h`);
  if (!heading) return;
  const reduce = document.documentElement.classList.contains('a11y-reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

function Shot({ entry, variant, step }: { entry: ShotEntry; variant: ShotVariant; step: GuideStep }) {
  const targets = (step.callouts ?? []).map((c) => c.target);
  const markers = placeCallouts(targets, entry.boxes, entry.w, entry.h, { marker: MARKER[variant] });
  return (
    <div class={`guide-shot guide-shot--${variant}`} style={{ maxWidth: variant === 'phone' ? `${Math.min(entry.w, 400)}px` : undefined }}>
      <div class="guide-shot__frame">
        <img src={`./${entry.file}`} width={entry.w} height={entry.h} alt={step.alt ?? ''} loading="lazy" decoding="async" />
        {markers.map((m) => (
          <span key={m.n} class="guide-marker" style={{ left: `${m.left}%`, top: `${m.top}%` }} aria-hidden="true">
            {m.n}
          </span>
        ))}
      </div>
    </div>
  );
}

function Figure({ step }: { step: GuideStep }) {
  const entry = step.shot ? MANIFEST.shots[step.shot] : undefined;
  const phone = entry?.phone ?? entry?.desktop;
  const desktop = entry?.desktop ?? entry?.phone;
  const hasLegend = (step.callouts?.length ?? 0) > 0;
  if (!phone && !desktop && !hasLegend) return null;
  const phoneVariant: ShotVariant = entry?.phone ? 'phone' : 'desktop';
  const desktopVariant: ShotVariant = entry?.desktop ? 'desktop' : 'phone';
  return (
    <figure class={`guide-fig${desktopVariant === 'phone' ? ' guide-fig--tall' : ''}`}>
      {phone && desktop ? (
        <>
          <div class="guide-only-narrow">
            <Shot entry={phone} variant={phoneVariant} step={step} />
          </div>
          <div class="guide-only-wide">
            <Shot entry={desktop} variant={desktopVariant} step={step} />
          </div>
        </>
      ) : (
        step.shot && <p class="px-text-muted">{GUIDE_META.noPicture}</p>
      )}
      {hasLegend && (
        <figcaption class="guide-legend">
          <span class="sr-only">{GUIDE_META.legendTitle}</span>
          <ol>
            {step.callouts!.map((c, i) => (
              <li key={c.target}>
                <span class="guide-legend__n" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{c.text}</span>
              </li>
            ))}
          </ol>
        </figcaption>
      )}
    </figure>
  );
}

function Step({ step, n, sectionId }: { step: GuideStep; n: number; sectionId: string }) {
  const id = `guide-${sectionId}-s${n}`;
  return (
    <li class="guide-step px-box" aria-labelledby={id}>
      <div class="guide-step__text">
        <h3 id={id} class="guide-step__title">
          <span class="guide-step__n" aria-hidden="true">
            {n}
          </span>
          <span>
            <span class="sr-only">
              {GUIDE_META.stepLabel} {n}:{' '}
            </span>
            {step.title}
          </span>
        </h3>
        <p>{step.text}</p>
        {step.list && (
          <ol class="guide-list">
            {step.list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        )}
        {step.tip && <p class="guide-tip">{step.tip}</p>}
      </div>
      <Figure step={step} />
    </li>
  );
}

function Section({ section, onTop }: { section: GuideSection; onTop: () => void }) {
  return (
    <section class="guide-section" aria-labelledby={`guide-${section.id}-h`}>
      <header class="guide-section__head">
        <span class="px-chip px-notch guide-section__kicker">{section.label}</span>
        <h2 id={`guide-${section.id}-h`} tabIndex={-1}>
          {section.title}
        </h2>
        <p>{section.intro}</p>
      </header>
      <ol class="guide-steps">
        {section.steps.map((step, i) => (
          <Step key={step.title} step={step} n={i + 1} sectionId={section.id} />
        ))}
      </ol>
      <button type="button" class="text-link guide-top" onClick={onTop}>
        {GUIDE_META.backToTop}
      </button>
    </section>
  );
}

export default function Guide() {
  const toc = useRef<HTMLHeadingElement>(null);
  const toTop = () => {
    toc.current?.scrollIntoView({ block: 'start' });
    toc.current?.focus({ preventScroll: true });
  };
  return (
    <div class="guide">
      <Panel class="guide-hero" aria-labelledby="guide-title">
        <div class="card-band px-sunrise" aria-hidden="true" />
        <div class="stack">
          <h2 id="guide-title">{GUIDE_META.title}</h2>
          <p>{GUIDE_META.intro}</p>
          <div class="guide-pdf">
            <Button href={GUIDE_META.pdfHref} variant="gold" download="ARAW-User-Guide.pdf" class="guide-pdf__btn">
              {GUIDE_META.pdfLink}
            </Button>
            <p class="px-text-muted">{GUIDE_META.pdfHint}</p>
          </div>
        </div>
      </Panel>

      <div class="guide-body">
        <nav class="guide-toc px-box" aria-labelledby="guide-toc-h">
          <h2 id="guide-toc-h" class="panel-title" tabIndex={-1} ref={toc}>
            {GUIDE_META.tocTitle}
          </h2>
          <ol>
            {GUIDE_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <button type="button" class="guide-toc__link" onClick={() => jumpTo(s.id)}>
                  <span class="guide-toc__n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div class="guide-main">
          {GUIDE_SECTIONS.map((s) => (
            <Section key={s.id} section={s} onTop={toTop} />
          ))}
        </div>
      </div>
    </div>
  );
}
