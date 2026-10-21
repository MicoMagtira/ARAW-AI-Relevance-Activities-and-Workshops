// Chatbot Sandbox lines for the medical and cultural reviewers (docs/CONTENT_REVIEW.md). The model's own answers are
// generated and cannot be reviewed; what is reviewed is everything ARAW wraps around them.
export interface SandboxReviewEntry {
  id: string;
  /** Where the lines live. */
  where: string;
  review_status: 'unreviewed';
}

const e = (id: string, where: string): SandboxReviewEntry => ({ id, where, review_status: 'unreviewed' });

export const SANDBOX_REVIEW: readonly SandboxReviewEntry[] = [
  e('sb-system-prompt', 'src/sandbox/prompt.ts systemPrompt'),
  e('sb-starters', "src/app/i18n.ts 'sb.s1'..'sb.s6'"),
  e('sb-red-flags', 'src/sandbox/guard.ts RULES (all five languages)'),
  e('sb-self-harm', "src/sandbox/guard.ts selfHarm + 'sb.sh.*' (hotline 1553)"),
  e('sb-red-flag-card', "src/app/i18n.ts 'sb.rf.*' (911)"),
  e('sb-personal-data', "src/sandbox/guard.ts detectPersonalData + 'sb.pii.*'"),
  e('sb-dose-filter', "src/sandbox/guard.ts DOSE_PATTERNS + 'sb.doseHidden'"),
  e('sb-trust-tips', "src/app/i18n.ts 'sb.tip.*', 'sb.trust.*', 'sb.langNote'"),
  e('sb-missions', "src/sandbox/missions.ts + 'sb.m.*'"),
];
