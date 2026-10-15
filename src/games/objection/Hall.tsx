// The barangay hall as a pixel-art SVG (120 x 60 units): the Kapitan's bench with a gavel, a flag, and the witness stand.
// The picture is decoration: the hearing is written out as text, so it carries a plain label.
interface Props {
  label: string;
  /** The Kapitan's gavel bangs (a ruling was just made). */
  bang?: boolean;
}

export function Hall({ label, bang }: Props) {
  return (
    <svg class="objection-hall" viewBox="0 0 120 60" role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width="120" height="60" fill="var(--cream)" />
      <rect y="50" width="120" height="10" fill="var(--soft)" />
      <rect y="50" width="120" height="3" fill="var(--line)" />
      {/* flag */}
      <rect x="6" y="6" width="2" height="44" fill="var(--ink)" />
      <rect x="8" y="8" width="16" height="12" fill="var(--navy)" />
      <rect x="14" y="11" width="4" height="4" fill="var(--gold)" />
      {/* the Kapitan */}
      <rect x="38" y="14" width="10" height="10" fill="var(--gold)" />
      <rect x="37" y="12" width="12" height="4" fill="var(--ink)" />
      <rect x="35" y="24" width="16" height="8" fill="var(--coral)" />
      {/* the bench */}
      <rect x="26" y="30" width="40" height="20" fill="var(--navy)" />
      <rect x="24" y="28" width="44" height="4" fill="var(--gold-deep)" />
      <rect x="30" y="38" width="32" height="2" fill="var(--gold)" />
      {/* the gavel */}
      <g class={bang ? 'objection-gavel is-bang' : 'objection-gavel'}>
        <rect x="54" y="22" width="8" height="4" fill="var(--ink)" />
        <rect x="57" y="26" width="2" height="4" fill="var(--ink)" />
      </g>
      {/* the witness at the stand */}
      <rect x="86" y="18" width="10" height="10" fill="var(--gold)" />
      <rect x="85" y="16" width="12" height="4" fill="var(--ink)" />
      <rect x="82" y="28" width="18" height="8" fill="var(--navy-tint)" />
      <rect x="78" y="34" width="26" height="16" fill="var(--ink)" />
      <rect x="76" y="32" width="30" height="4" fill="var(--gold-deep)" />
    </svg>
  );
}
