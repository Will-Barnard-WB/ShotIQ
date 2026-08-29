import type { ClubCategory } from "./types";

/**
 * The R10's "Club Type" column is a short code and varies between app
 * versions, so category is derived from the club name, which is stable and
 * human-readable. Benchmarks are keyed on the category, not the club.
 */
export function clubCategory(clubName: string, clubTypeRaw?: string | null): ClubCategory {
  const s = `${clubName} ${clubTypeRaw ?? ""}`.toLowerCase();

  if (/\bputter\b|\bpt\b/.test(s)) return "putter";
  if (/\bdriver\b|\bdr\b|^1w\b/.test(s)) return "driver";
  if (/\bhybrid\b|\bhy\b|\d\s*h\b/.test(s)) return "hybrid";
  if (/\bwood\b|\d\s*w\b|\bfw\b/.test(s)) return "wood";
  if (/wedge|\bpw\b|\bgw\b|\baw\b|\bsw\b|\blw\b|\d{2}\s*(deg|°)/.test(s)) return "wedge";
  if (/\biron\b|\d\s*i\b/.test(s)) return "iron";
  return "other";
}

/** Rough descending order for display, so cards read driver -> wedge. */
const ORDER: ClubCategory[] = ["driver", "wood", "hybrid", "iron", "wedge", "putter", "other"];

/** Sort long clubs first, then by the number in the club name descending. */
export function compareClubs(a: { clubName: string; clubCategory: ClubCategory },
                             b: { clubName: string; clubCategory: ClubCategory }): number {
  const ci = ORDER.indexOf(a.clubCategory) - ORDER.indexOf(b.clubCategory);
  if (ci !== 0) return ci;
  const na = Number(a.clubName.match(/\d+/)?.[0] ?? NaN);
  const nb = Number(b.clubName.match(/\d+/)?.[0] ?? NaN);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.clubName.localeCompare(b.clubName);
}
