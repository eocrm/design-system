/** Chart-palette slot (`--chart-N`). */
export type FunnelSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Silhouette between stages: hold then a short straight taper, or a full-column trapezoid. */
export type FunnelShape = 'taper' | 'sharp';

/** One funnel stage as supplied by the consumer. */
export interface FunnelStage {
  /** Stable identity (React key). */
  key: string;
  /** Human name shown in labels, tooltip and data table. */
  label: string;
  /** Count for this stage. Non-finite or negative values are treated as 0. */
  value: number;
  /** Palette slot to highlight this stage with (e.g. Won in green); omit to follow the one-hue ramp. */
  color?: FunnelSlot;
}

/** A stage with sanitised value, resolved colour slot and derived ratios. */
export interface ResolvedStage {
  key: string;
  label: string;
  /** Sanitised: non-finite or negative becomes 0. */
  value: number;
  /** The explicit `color` slot, or null for the ramp colour. */
  slot: FunnelSlot | null;
  /** `value / max(values)`; 0 when the max is 0. */
  heightRatio: number;
  /** `value / previous value`; null for the first stage or when the previous is <= 0. */
  stepRatio: number | null;
  /** `value / first value`; null when the first is <= 0. */
  shareRatio: number | null;
}

/** Per-stage width in px below which the layout goes vertical. */
export const MIN_STAGE_WIDTH = 96;
/** Minimum drawn height in px of a stage, so zero values stay hoverable. */
export const MIN_THICKNESS = 6;
/** Taper shape: fraction of the column held at the stage's height before the diagonal starts. */
export const TAPER_HOLD = 0.75;

/** Sanitise values and compute ratios. */
export function resolveStages(stages: readonly FunnelStage[]): ResolvedStage[] {
  const values = stages.map((s) => (Number.isFinite(s.value) && s.value > 0 ? s.value : 0));
  const max = Math.max(0, ...values);
  const first = values[0] ?? 0;
  return stages.map((s, i) => ({
    key: s.key,
    label: s.label,
    value: values[i],
    slot: s.color ?? null,
    heightRatio: max > 0 ? values[i] / max : 0,
    stepRatio: i > 0 && values[i - 1] > 0 ? values[i] / values[i - 1] : null,
    shareRatio: first > 0 ? values[i] / first : null,
  }));
}

/** Horizontal while each stage gets at least `MIN_STAGE_WIDTH` px, otherwise vertical. */
export function orientationFor(width: number, count: number): 'horizontal' | 'vertical' {
  return width / Math.max(count, 1) >= MIN_STAGE_WIDTH ? 'horizontal' : 'vertical';
}

/** Path and anchor points of one stage, in SVG user units. */
export interface StageGeometry {
  /** SVG path of the stage's closed outline. */
  d: string;
  /** Column centre x. */
  cx: number;
  /** Vertical centre (shared by all stages). */
  cy: number;
  /** Column left edge. */
  x0: number;
  /** Column right edge. */
  x1: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Outline of each stage, vertically centred; each stage tapers into the next one's height. */
export function stageGeometry(args: {
  stages: readonly ResolvedStage[];
  width: number;
  height: number;
  shape: FunnelShape;
}): StageGeometry[] {
  const { stages, width, height, shape } = args;
  const colW = width / stages.length;
  const mid = height / 2;
  const half = (s: ResolvedStage) => Math.max(MIN_THICKNESS / 2, (s.heightRatio * height) / 2);

  return stages.map((s, i) => {
    const x0 = i * colW;
    const x1 = (i + 1) * colW;
    const a = half(s);
    const last = i === stages.length - 1;
    const b = last ? a : half(stages[i + 1]);
    const [t0, t1, b0, b1] = [mid - a, mid - b, mid + b, mid + a].map(r2);
    const p = (x: number, y: number) => `${r2(x)},${y}`;
    let d: string;
    if (shape === 'sharp' || last) {
      d = `M ${p(x0, t0)} L ${p(x1, t1)} L ${p(x1, b0)} L ${p(x0, b1)} Z`;
    } else {
      const xh = x0 + colW * TAPER_HOLD;
      d =
        `M ${p(x0, t0)} L ${p(xh, t0)} L ${p(x1, t1)}` +
        ` L ${p(x1, b0)} L ${p(xh, b1)} L ${p(x0, b1)} Z`;
    }
    return { d, cx: r2(x0 + colW / 2), cy: mid, x0: r2(x0), x1: r2(x1) };
  });
}

/** Column index under `x`, or null outside `[0, width)`. */
export function stageIndexAt(width: number, count: number, x: number): number | null {
  if (!(x >= 0 && x < width) || count <= 0) return null;
  return Math.min(count - 1, Math.floor((x / width) * count));
}

/** Percent string; one decimal for ratios under 1%, otherwise whole percent. */
export function formatPercent(ratio: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: ratio > 0 && ratio < 0.01 ? 1 : 0,
  }).format(ratio);
}
