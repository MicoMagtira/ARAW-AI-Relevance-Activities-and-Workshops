// One Komiks panel drawn as a pixel SVG scene from its descriptor (docs/SPEC.md section 8): backdrop for the setting and time,
// props, then the cast. Ara uses her own sprite frames; everyone else is an avatar-style sprite with an expression.
import { useMemo } from 'preact/hooks';
import type { KomiksPanel } from '../../content/library/komiks';
import { GRID, PALETTE, getFrame, pathFor, runsByColour } from '../ara/frames';
import { ARA_MOOD_FOR, SCENE_H, SCENE_W, castRects, charSize, propRects, rectPaths, sceneLayers, type Layer, type Rect } from './art';

const araPaths = (mood: Parameters<typeof getFrame>[0]) =>
  [...runsByColour(getFrame(mood))].map(([key, runs]) => ({ key, d: pathFor(runs), fill: PALETTE[key] as string }));

function Paths({ rects }: { rects: readonly Rect[] }) {
  return (
    <>
      {rectPaths(rects).map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </>
  );
}

function Layers({ layers }: { layers: readonly Layer[] }) {
  return (
    <>
      {layers.map((layer, i) => (
        <g key={i} opacity={layer.opacity}>
          <Paths rects={layer.rects} />
        </g>
      ))}
    </>
  );
}

interface SceneProps {
  panel: KomiksPanel;
  /** Thumbnails and other repeats are decorative; the reader's scene carries the panel's alt text. */
  decorative?: boolean;
  class?: string;
}

export function KomiksScene({ panel, decorative, class: className }: SceneProps) {
  const art = useMemo(() => {
    const layers = sceneLayers(panel.setting, panel.time);
    const size = charSize(panel.characters.length);
    const count = panel.characters.length;
    return {
      ...layers,
      props: propRects(panel.props),
      cast: panel.characters.map((c, i) => {
        const x = Math.round((SCENE_W * (i + 0.5)) / count - size / 2);
        const y = SCENE_H - size;
        return c.who === 'ara'
          ? { key: `${i}-${c.who}`, x, y, size, box: GRID, paths: araPaths(ARA_MOOD_FOR[c.expression]) }
          : { key: `${i}-${c.who}`, x, y, size, box: 16, paths: rectPaths(castRects(c.who, c.expression)).map((p) => ({ key: p.fill, d: p.d, fill: p.fill })) };
      }),
    };
  }, [panel]);

  return (
    <svg
      class={`komiks-scene${className ? ' ' + className : ''}`}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      shape-rendering="crispEdges"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : panel.alt}
      aria-hidden={decorative ? 'true' : undefined}
      focusable="false"
      data-setting={panel.setting}
      data-time={panel.time}
    >
      <Layers layers={art.back} />
      <Paths rects={art.props.behind} />
      {art.cast.map((c) => (
        <svg key={c.key} x={c.x} y={c.y} width={c.size} height={c.size} viewBox={`0 0 ${c.box} ${c.box}`} shape-rendering="crispEdges">
          {c.paths.map((p) => (
            <path key={p.key} d={p.d} fill={p.fill} />
          ))}
        </svg>
      ))}
      <Layers layers={art.front} />
      <Paths rects={art.props.front} />
    </svg>
  );
}
