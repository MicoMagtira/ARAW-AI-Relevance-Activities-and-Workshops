// The project's partner logos (built by scripts/logos/build_logos.py), always on white: several marks are navy or grey ink
// made for paper. One row that wraps, each logo at its own optical height so square seals and wide wordmarks look equally
// big. Shown on the sunrise splash, the language landing, the Home banner and the About page.
import { t } from '../app/i18n';
import sizes from '../assets/logos/logos.json';

const FILES = import.meta.glob<string>('../assets/logos/*.webp', { eager: true, query: '?url', import: 'default' });

interface Partner {
  slug: keyof typeof sizes;
  /** Full name, the alt text. Proper names: they stay in English in every language. */
  name: string;
}

/** The order is fixed by the project. Not exported: the alt texts are proper names, not strings to translate. */
const PARTNERS: readonly Partner[] = [
  { slug: '01_dost', name: 'Department of Science and Technology (DOST)' },
  { slug: '02_dost_pchrd', name: 'DOST Philippine Council for Health Research and Development (DOST-PCHRD)' },
  { slug: '03_national_university', name: 'National University' },
  { slug: '04_nicer_dost', name: 'DOST Niche Centers in the Regions for R&D (NICER)' },
  { slug: '05_nicer_rdc_nlpha', name: 'Research and Development Center on Natural Language Processing for Health Applications (RDC-NLPHA)' },
  { slug: '06_aikasalig', name: 'AIKasalig' },
];

/** Logos whose ink is lighter or finer than the rest and need a little more height to read as the same size. */
const BOOST: Partial<Record<Partner['slug'], number>> = { '05_nicer_rdc_nlpha': 1.3 };

/**
 * Height multiplier for a logo of the given width/height ratio: wide wordmarks shrink, square seals grow, so every
 * logo covers a similar area (TALA's core/brand.py optical_factor).
 */
export function opticalFactor(aspect: number, slug?: Partner['slug']): number {
  let factor = Math.max(0.62, Math.min(1.15, aspect ** -0.38));
  if (aspect < 1.3) factor *= 1.2;
  return factor * ((slug && BOOST[slug]) || 1);
}

interface PartnerLogosProps {
  /** Splash and landing panel, the Home band, or the big About wall: each sets its own --logo-h in CSS. */
  variant: 'strip' | 'band' | 'wall';
  class?: string;
}

export function PartnerLogos({ variant, class: className }: PartnerLogosProps) {
  return (
    <ul class={`partners partners--${variant}${className ? ` ${className}` : ''}`} aria-label={t('partners.label')}>
      {PARTNERS.map((p) => {
        const { w, h } = sizes[p.slug];
        return (
          <li key={p.slug} class="partners__item">
            <img
              class="partners__logo"
              src={FILES[`../assets/logos/${p.slug}.webp`]}
              width={w}
              height={h}
              alt={p.name}
              title={p.name}
              decoding="async"
              style={{ '--f': opticalFactor(w / h, p.slug).toFixed(3) }}
            />
          </li>
        );
      })}
    </ul>
  );
}
