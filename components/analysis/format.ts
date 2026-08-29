/** Shared number formatting for the analysis screen. */

export const deg = (v: number | null, dp = 1): string =>
  v === null ? "—" : `${v < 0 ? "−" : v > 0 ? "+" : ""}${Math.abs(v).toFixed(dp)}°`;

export const yds = (v: number | null, dp = 0): string =>
  v === null ? "—" : `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)} yds`;

export const num = (v: number | null, dp = 2): string => (v === null ? "—" : v.toFixed(dp));

export const pct = (v: number): string => `${Math.round(v * 100)}%`;

export const longDate = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

export const shortDate = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
