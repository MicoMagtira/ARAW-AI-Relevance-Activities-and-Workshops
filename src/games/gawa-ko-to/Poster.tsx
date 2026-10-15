// The finished poster as an SVG (240 x 320 units, pixel art with crisp edges). It redraws from the Poster state, so what the
// player builds is exactly what is checked. Colours come from the CSS tokens; text sizes and fonts live in gawa.css.
import { ARTIST, DOCTOR, NEIGHBOR, PICTURES, PLACE, topicById, type Motif, type PictureId } from './parts';
import { factOf, sloganOf, wrap, type Brief, type Poster } from './rules';

const C = {
  cream: 'var(--cream)',
  surface: 'var(--surface)',
  gold: 'var(--gold)',
  deep: 'var(--gold-deep)',
  navy: 'var(--navy)',
  tint: 'var(--navy-tint)',
  ink: 'var(--ink)',
  coral: 'var(--coral)',
  fact: 'var(--fact)',
  factTint: 'var(--fact-tint)',
  fake: 'var(--fake)',
  fakeTint: 'var(--fake-tint)',
  soft: 'var(--soft)',
  line: 'var(--line)',
} as const;

/** 8 x 8 pixel icons for each topic. */
const BITS: Readonly<Record<Motif, readonly string[]>> = {
  mosquito: ['#......#', '.#....#.', '..####..', '...##...', '..####..', '.#.##.#.', '#..##..#', '...##...'],
  drop: ['...##...', '...##...', '..####..', '.######.', '.######.', '.######.', '..####..', '........'],
  syringe: ['......##', '.....##.', '....##..', '...##...', '..###...', '.###....', '##......', '#.......'],
  heart: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
  lungs: ['...##...', '..####..', '.##..##.', '###..###', '###..###', '###..###', '.##..##.', '........'],
  paw: ['.#.##.#.', '.#.##.#.', '..####..', '.######.', '########', '########', '.######.', '..#..#..'],
  baby: ['..####..', '.######.', '##.##.##', '########', '##.##.##', '.#.##.#.', '..####..', '........'],
};

/** Path data for an 8 x 8 bitmap, merged into one rectangle per run of pixels. */
export function bitsPath(rows: readonly string[], x: number, y: number, s: number): string {
  let d = '';
  rows.forEach((row, r) => {
    for (const run of row.matchAll(/#+/g)) d += `M${x + (run.index ?? 0) * s} ${y + r * s}h${run[0].length * s}v${s}h-${run[0].length * s}z`;
  });
  return d;
}

const Bits = ({ motif, x, y, s, fill }: { motif: Motif; x: number; y: number; s: number; fill: string }) => (
  <path d={bitsPath(BITS[motif], x, y, s)} fill={fill} shape-rendering="crispEdges" />
);

const PX = { x: 16, y: 48, w: 208, h: 116 } as const;

function Scene({ picture, motif }: { picture: PictureId; motif: Motif }) {
  const cx = PX.x + PX.w / 2;
  switch (picture) {
    case 'ai':
      return (
        <g>
          <rect {...PX} fill={C.tint} />
          <path d="M16 140h208v8H16zM16 124h208v4H16z" fill={C.surface} opacity="0.5" />
          <Bits motif={motif} x={cx - 40} y={PX.y + 26} s={10} fill={C.navy} />
          <path d="M182 120h8v8h-8zM50 128h8v8h-8z" fill={C.deep} />
          <path d="M42 60h4v20h-4zM34 68h20v4H34zM192 62h4v20h-4zM184 70h20v4h-20z" fill={C.deep} />
        </g>
      );
    case 'stock':
      return (
        <g>
          <rect {...PX} fill={C.soft} />
          <path d="M16 140h208v24H16z" fill={C.line} />
          <path d="M44 112h24v36H44zM100 100h24v48h-24zM156 116h24v32h-24z" fill={C.navy} />
          <path d="M48 92h16v16H48zM104 80h16v16h-16zM160 96h16v16h-16z" fill={C.deep} />
          <path d="M196 56h20v20h-20z" fill={C.surface} />
          <Bits motif={motif} x={198} y={58} s={2} fill={C.ink} />
        </g>
      );
    case 'neighbor':
      return (
        <g>
          <rect {...PX} fill={C.gold} />
          <path d="M72 140h96v24H72z" fill={C.navy} />
          <path d="M96 128h48v14H96z" fill={C.deep} />
          <path d="M84 72h72v56H84z" fill={C.deep} />
          <path d="M80 64h80v12H80zM84 60h72v4H84z" fill={C.ink} />
          <path d="M100 90h8v8h-8zM132 90h8v8h-8z" fill={C.ink} />
          <path d="M104 112h32v4h-32zM100 108h4v4h-4zM136 108h4v4h-4z" fill={C.ink} />
        </g>
      );
    case 'artist':
      return (
        <g>
          <rect {...PX} fill={C.cream} />
          <path d="M16 56h208v6H16z" fill={C.coral} />
          <path d="M16 64h208v6H16z" fill={C.deep} />
          <path d="M16 72h208v6H16z" fill={C.gold} />
          <path d="M16 140h208v24H16z" fill={C.factTint} />
          <path d="M16 140h24v4H16zM64 144h32v4H64zM120 140h40v4h-40zM180 144h44v4h-44z" fill={C.fact} />
          <Bits motif={motif} x={cx - 40} y={PX.y + 26} s={10} fill={C.ink} />
          <text x="200" y="158" class="poster-script">
            ~Dani
          </text>
        </g>
      );
    case 'ai-doctor':
      return (
        <g>
          <rect {...PX} fill={C.tint} />
          <path d="M80 130h80v34H80z" fill={C.surface} />
          <path d="M112 130h16v34h-16z" fill={C.navy} />
          <path d="M96 76h48v52H96z" fill={C.deep} />
          <path d="M92 68h56v12H92z" fill={C.ink} />
          <path d="M108 92h8v8h-8zM124 92h8v8h-8z" fill={C.ink} />
          <path d="M110 112h20v4h-20z" fill={C.ink} />
          <path d="M100 132h4v24h-4zM104 152h12v4h-12z" fill={C.ink} />
          <path d="M170 106h28v44h-28z" fill={C.coral} />
          <path d="M174 98h20v8h-20z" fill={C.ink} />
          <text x="177" y="136" class="poster-q">
            ?
          </text>
          <path d="M16 60h208v4H16zM16 100h120v4H16zM60 148h164v4H60z" fill={C.fake} opacity="0.4" />
        </g>
      );
  }
}

export interface PosterSvgProps {
  poster: Poster;
  brief: Brief;
  /** Unique id prefix, for the title and description ids. */
  id?: string;
  /** Show the "Reported!" stamp. */
  reported?: boolean;
  /** Show the "ARAW GAME · FAKE" stamp (a wrong fact or a made-up endorsement). */
  fake?: boolean;
}

/** The plain-words description of a poster, for the SVG and for screen readers. */
export function describePoster(poster: Poster, brief: Brief): string {
  const topic = topicById(brief.topic);
  const pic = PICTURES.find((p) => p.id === poster.picture);
  const slogan = sloganOf(topic, poster.slogan);
  const fact = factOf(topic, poster.fact);
  const parts = [`Poster for ${PLACE}: ${topic.title}.`];
  parts.push(pic ? `Picture: ${pic.name}.` : 'No picture yet.');
  parts.push(slogan ? `Slogan: ${slogan.text}` : 'No slogan yet.');
  parts.push(fact ? `Health fact: ${fact.text}` : 'No health fact yet.');
  if (poster.label) parts.push('Sticker: Made with AI.');
  if (poster.credit) parts.push(`Credit: Art by ${ARTIST}.`);
  if (poster.asked && (poster.picture === 'neighbor' || poster.picture === 'ai-doctor')) parts.push(poster.picture === 'neighbor' ? `Permission asked of ${NEIGHBOR}.` : `Permission asked of ${DOCTOR}.`);
  return parts.join(' ');
}

export function PosterSvg({ poster, brief, id = 'poster', reported, fake }: PosterSvgProps) {
  const topic = topicById(brief.topic);
  const slogan = sloganOf(topic, poster.slogan);
  const fact = factOf(topic, poster.fact);
  const description = describePoster(poster, brief) + (reported ? ' Stamp: Reported!' : '') + (fake ? ' Stamp: ARAW GAME FAKE.' : '');
  const sloganLines = slogan ? wrap(slogan.text, 22) : [];
  const factLines = fact ? wrap(fact.text, 38) : [];
  const footer: string[] = [];
  if (poster.credit) footer.push(`Art: ${ARTIST}`);
  if (poster.picture === 'neighbor' && poster.asked) footer.push(`${NEIGHBOR}: with permission`);

  return (
    <svg class="gawa-poster" viewBox="0 0 240 320" role="img" aria-labelledby={`${id}-t`} shape-rendering="crispEdges">
      <title id={`${id}-t`}>{description}</title>
      <rect x="0" y="0" width="240" height="320" fill={C.surface} />
      <rect x="0" y="0" width="240" height="40" fill={C.gold} />
      <text x="120" y="17" class="poster-head" text-anchor="middle">
        {PLACE.toUpperCase()}
      </text>
      <text x="120" y="32" class="poster-title" text-anchor="middle">
        {topic.title}
      </text>

      {poster.picture ? (
        <g>
          <Scene picture={poster.picture} motif={topic.motif} />
          <rect x={PX.x} y={PX.y} width={PX.w} height={PX.h} fill="none" stroke={C.ink} stroke-width="3" />
        </g>
      ) : (
        <g>
          <rect x={PX.x} y={PX.y} width={PX.w} height={PX.h} fill={C.soft} stroke={C.ink} stroke-width="3" stroke-dasharray="6 4" />
          <text x="120" y="110" class="poster-ph" text-anchor="middle">
            Pick a picture
          </text>
        </g>
      )}

      {slogan ? (
        sloganLines.map((l, i) => (
          <text key={l} x="120" y={184 + i * 12} class="poster-slogan" text-anchor="middle">
            {l}
          </text>
        ))
      ) : (
        <text x="120" y="190" class="poster-ph" text-anchor="middle">
          Pick a slogan
        </text>
      )}

      <rect x="16" y="208" width="208" height="62" fill={fact ? C.cream : C.soft} stroke={C.ink} stroke-width="3" stroke-dasharray={fact ? undefined : '6 4'} />
      {fact ? (
        factLines.map((l, i) => (
          <text key={l} x="24" y={226 + i * 14} class="poster-fact">
            {l}
          </text>
        ))
      ) : (
        <text x="120" y="244" class="poster-ph" text-anchor="middle">
          Pick a health fact
        </text>
      )}

      {footer.map((l, i) => (
        <text key={l} x="16" y={286 + i * 12} class="poster-foot">
          {l}
        </text>
      ))}
      {poster.label && (
        <g>
          <rect x="128" y="278" width="96" height="30" fill={C.factTint} stroke={C.ink} stroke-width="3" />
          <text x="176" y="291" class="poster-label" text-anchor="middle">
            MADE
          </text>
          <text x="176" y="302" class="poster-label" text-anchor="middle">
            WITH AI
          </text>
        </g>
      )}
      <rect x="1.5" y="1.5" width="237" height="317" fill="none" stroke={C.ink} stroke-width="3" />

      {reported && (
        <g>
          <rect x="8" y="112" width="224" height="46" fill={C.fakeTint} stroke={C.fake} stroke-width="4" />
          <text x="120" y="142" class="poster-stamp" text-anchor="middle">
            REPORTED!
          </text>
        </g>
      )}
      {fake && (
        <g>
          <rect x="24" y="166" width="192" height="22" fill={C.fakeTint} stroke={C.fake} stroke-width="3" />
          <text x="120" y="181" class="poster-stamp-s" text-anchor="middle">
            ARAW GAME · FAKE
          </text>
        </g>
      )}
    </svg>
  );
}
