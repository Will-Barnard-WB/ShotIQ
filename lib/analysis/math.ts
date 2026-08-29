/** Small numeric helpers. All of them ignore nulls rather than treating
 *  a missing reading as zero, which would silently drag averages down. */

export function nums(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

export function mean(values: (number | null | undefined)[]): number | null {
  const v = nums(values);
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/** Sample standard deviation (n-1). Null for fewer than 2 readings. */
export function stdev(values: (number | null | undefined)[]): number | null {
  const v = nums(values);
  if (v.length < 2) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const ss = v.reduce((a, b) => a + (b - m) ** 2, 0);
  return Math.sqrt(ss / (v.length - 1));
}

export function min(values: (number | null | undefined)[]): number | null {
  const v = nums(values);
  return v.length ? Math.min(...v) : null;
}

export function max(values: (number | null | undefined)[]): number | null {
  const v = nums(values);
  return v.length ? Math.max(...v) : null;
}

export function round(value: number | null, dp = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Group items by a key, preserving first-seen order. */
export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = out.get(k);
    if (bucket) bucket.push(item);
    else out.set(k, [item]);
  }
  return out;
}
