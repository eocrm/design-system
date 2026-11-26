// textDiff.ts — a character diff (Myers) for mapping offsets across a remote text change.

const SURROGATE = /[\uD800-\uDFFF]/;

/**
 * For each UTF-16 unit of `a`, its index in `b` when a shortest edit script (Myers, O((N+M)·D))
 * keeps it, else -1. Kept indices strictly increase. Common prefix and suffix are matched first.
 * Strings with surrogates are diffed by code point, so a pair is kept or dropped whole.
 * @internal
 */
export function keptIndices(a: string, b: string, maxD = 1000): Int32Array {
  if (!SURROGATE.test(a) && !SURROGATE.test(b)) return kept(a, b, maxD);
  const ca = Array.from(a);
  const cb = Array.from(b);
  const units = (cs: string[]) => {
    const at: number[] = [];
    let u = 0;
    for (const c of cs) {
      at.push(u);
      u += c.length;
    }
    return at;
  };
  const ua = units(ca);
  const ub = units(cb);
  const keepCp = kept(ca, cb, maxD);
  const keep = new Int32Array(a.length).fill(-1);
  keepCp.forEach((j, i) => {
    // Equal code points have equal lengths.
    if (j >= 0) for (let t = 0; t < ca[i].length; t++) keep[ua[i] + t] = ub[j] + t;
  });
  return keep;
}

function kept(a: string | string[], b: string | string[], maxD: number): Int32Array {
  const keep = new Int32Array(a.length).fill(-1);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) keep[pre] = pre++;
  let suf = 0;
  while (
    suf < a.length - pre &&
    suf < b.length - pre &&
    a[a.length - 1 - suf] === b[b.length - 1 - suf]
  ) {
    keep[a.length - 1 - suf] = b.length - 1 - suf;
    suf++;
  }
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const n = A.length;
  const m = B.length;
  if (!n || !m) return keep;
  const max = n + m;
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = []; // trace[d]: v before step d, as v[off - d - 1 .. off + d + 1]
  // ponytail: past maxD edits the middle is left unmatched (one remote hunk), bounding the cost
  // per keystroke; raise maxD if heavily diverged stale edits need finer mapping.
  for (let d = 0; d <= Math.min(max, maxD); d++) {
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])
          ? v[off + k + 1]
          : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && A[x] === B[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) {
        // Walk back through the trace, recording every diagonal (kept) step.
        for (let dd = d; dd > 0; dd--) {
          const prev = trace[dd];
          const at = (kk: number) => prev[kk + dd + 1];
          const kk = x - y;
          const pk = kk === -dd || (kk !== dd && at(kk - 1) < at(kk + 1)) ? kk + 1 : kk - 1;
          const px = at(pk);
          const sx = pk === kk + 1 ? px : px + 1; // where this step's snake starts
          while (x > sx) {
            x--;
            y--;
            keep[pre + x] = pre + y;
          }
          x = px;
          y = px - pk;
        }
        while (x > 0) {
          x--;
          y--;
          keep[pre + x] = pre + y;
        }
        return keep;
      }
    }
  }
  return keep;
}
