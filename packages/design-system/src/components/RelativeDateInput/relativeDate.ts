export type RelativePeriod = 'week' | 'month' | 'quarter' | 'year';
export type RelativeScope = 'this' | 'last' | 'next';
export type RelativeUnit = 'd' | 'w' | 'm' | 'y' | 'h' | 'min';
export type RelativeDateValue =
  | {
      kind: 'anchor';
      anchor: 'today' | 'now';
      offset?: { sign: 1 | -1; n: number; unit: RelativeUnit };
    }
  | {
      kind: 'boundary';
      edge: 'start' | 'end';
      scope: RelativeScope;
      period: RelativePeriod;
      offset?: { sign: 1 | -1; n: number; unit: 'd' | 'w' | 'm' | 'y' };
    }
  | { kind: 'exact'; date: string } // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ssZ'
  | { kind: 'rolling'; dir: 'last' | 'next'; n: number; unit: 'd' | 'w' | 'm' | 'y' }
  | { kind: 'period'; scope: RelativeScope; period: RelativePeriod }
  | { kind: 'toDate'; period: RelativePeriod };

export interface RelativeDateOptions {
  mode: 'point' | 'range';
  allowNow?: boolean;
}

export const OFFSET_MAX = 1000;
export const ROLLING_MIN = 1;
export const ROLLING_MAX = 1000;

const ANCHOR_RE = /^(today|now)(?:([+-])(\d{1,4})(d|w|m|y|h|min))?$/;
const BOUNDARY_RE =
  /^(start|end):(this|last|next):(week|month|quarter|year)(?:([+-])(\d{1,4})(d|w|m|y))?$/;
const EXACT_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})Z)?$/;
const ROLLING_RE = /^(last|next):(\d{1,4})(d|w|m|y)$/;
const PERIOD_RE = /^(this|last|next):(week|month|quarter|year)$/;
const TO_DATE_RE = /^this:(week|month|quarter|year):to_date$/;

function parseOffset(sign: string | undefined, n: string | undefined, unit: string | undefined) {
  if (sign === undefined) return { ok: true as const, offset: undefined };
  const num = Number(n);
  if (num > OFFSET_MAX) return { ok: false as const };
  return {
    ok: true as const,
    offset: { sign: (sign === '-' ? -1 : 1) as 1 | -1, n: num, unit: unit as RelativeUnit },
  };
}

function isRealDate(m: RegExpExecArray): boolean {
  const [y, mo, d, h = 0, mi = 0, s = 0] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
  if (h > 23 || mi > 59 || s > 59) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function parseRelativeDate(
  expr: string,
  opts: RelativeDateOptions,
): RelativeDateValue | null {
  const allowNow = opts.allowNow === true;
  if (opts.mode === 'point') {
    let m = ANCHOR_RE.exec(expr);
    if (m) {
      const anchor = m[1] as 'today' | 'now';
      if (anchor === 'now' && !allowNow) return null;
      if (anchor === 'today' && (m[4] === 'h' || m[4] === 'min')) return null;
      const o = parseOffset(m[2], m[3], m[4]);
      if (!o.ok) return null;
      return o.offset ? { kind: 'anchor', anchor, offset: o.offset } : { kind: 'anchor', anchor };
    }
    m = BOUNDARY_RE.exec(expr);
    if (m) {
      const o = parseOffset(m[4], m[5], m[6]);
      if (!o.ok) return null;
      const base = {
        kind: 'boundary' as const,
        edge: m[1] as 'start' | 'end',
        scope: m[2] as RelativeScope,
        period: m[3] as RelativePeriod,
      };
      return o.offset
        ? { ...base, offset: o.offset as { sign: 1 | -1; n: number; unit: 'd' | 'w' | 'm' | 'y' } }
        : base;
    }
    m = EXACT_RE.exec(expr);
    if (m && isRealDate(m) && (m[4] === undefined || allowNow))
      return { kind: 'exact', date: expr };
    return null;
  }
  let m = ROLLING_RE.exec(expr);
  if (m) {
    const n = Number(m[2]);
    if (n < ROLLING_MIN || n > ROLLING_MAX) return null;
    return {
      kind: 'rolling',
      dir: m[1] as 'last' | 'next',
      n,
      unit: m[3] as 'd' | 'w' | 'm' | 'y',
    };
  }
  m = PERIOD_RE.exec(expr);
  if (m) return { kind: 'period', scope: m[1] as RelativeScope, period: m[2] as RelativePeriod };
  m = TO_DATE_RE.exec(expr);
  if (m) return { kind: 'toDate', period: m[1] as RelativePeriod };
  return null;
}

function formatOffset(o?: { sign: 1 | -1; n: number; unit: string }): string {
  return o && o.n !== 0 ? `${o.sign === -1 ? '-' : '+'}${o.n}${o.unit}` : '';
}

export function formatRelativeDate(v: RelativeDateValue): string {
  switch (v.kind) {
    case 'anchor':
      return v.anchor + formatOffset(v.offset);
    case 'boundary':
      return `${v.edge}:${v.scope}:${v.period}${formatOffset(v.offset)}`;
    case 'exact':
      return v.date;
    case 'rolling':
      return `${v.dir}:${v.n}${v.unit}`;
    case 'period':
      return `${v.scope}:${v.period}`;
    case 'toDate':
      return `this:${v.period}:to_date`;
  }
}
