import Papa from "papaparse";
import { clubCategory } from "./clubs";
import type { ParseResult, Shot } from "./types";

/**
 * Parser for Garmin Approach R10 session exports (Garmin Golf app ->
 * Export session data).
 *
 * Three things about the real export that the format is not obvious about:
 *
 *  1. The file starts with a UTF-8 BOM.
 *  2. Row 2 is a units row (",,,,,[mph],[deg],[yds],..."), not data. It is
 *     also where the units actually live -- the header carries none -- so it
 *     is consumed for unit detection and then dropped.
 *  3. "Club Name" is the user's own label for a club and is usually blank.
 *     The club is in "Club Type" ("7 Iron", "3 Wood"). Either can identify a
 *     club, so either satisfies the requirement and Club Name wins when both
 *     are set.
 *
 * Header strings vary between app versions, so headers are normalised
 * (lowercased, bracketed units stripped, punctuation removed) and matched
 * against alias lists. Anything required that fails to match is reported in
 * `missingHeaders` by its original name so the upload UI can name it -- a
 * column is never silently read as null.
 */

const YARDS_PER_METRE = 1.09361;
const MPH_PER_KPH = 0.621371;

/** normalise "Carry Deviation Distance [yds]" -> "carrydeviationdistance" */
function normalise(header: string): string {
  return header
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type FieldKey = keyof typeof FIELD_ALIASES;

const FIELD_ALIASES = {
  date: ["date", "datetime", "timestamp", "shotdate"],
  player: ["player", "playername"],
  clubName: ["clubname", "club"],
  clubType: ["clubtype"],
  clubSpeed: ["clubspeed", "clubheadspeed"],
  attackAngle: ["attackangle", "angleofattack", "aoa"],
  clubPath: ["clubpath", "path"],
  clubFace: ["clubface", "faceangle"],
  faceToPath: ["facetopath", "facepath"],
  ballSpeed: ["ballspeed"],
  smashFactor: ["smashfactor", "smash", "efficiency"],
  launchAngle: ["launchangle", "verticallaunchangle"],
  launchDirection: ["launchdirection", "horizontallaunchangle", "launchdir"],
  backspin: ["backspin"],
  sidespin: ["sidespin"],
  spinRate: ["spinrate"],
  spinAxis: ["spinaxis"],
  apexHeight: ["apexheight", "apex", "peakheight"],
  carryDistance: ["carrydistance", "carry"],
  carryDeviationAngle: ["carrydeviationangle"],
  carryDeviationDistance: ["carrydeviationdistance", "deviationdistance", "carrydeviation"],
  totalDistance: ["totaldistance", "total", "totaldist"],
  totalDeviationAngle: ["totaldeviationangle"],
  totalDeviationDistance: ["totaldeviationdistance"],
  note: ["note", "notes"],
  tags: ["tag", "tags"],
  // Present in the real export and deliberately unused. Listing them keeps
  // them out of `unmappedHeaders`, so that field only ever reports columns
  // ShotIQ genuinely did not recognise.
  brandModel: ["brandmodel"],
  spinRateType: ["spinratetype"],
  targetTotalDistance: ["targettotaldistance"],
  targetCarryDistance: ["targetcarrydistance"],
  airDensity: ["airdensity"],
  temperature: ["temperature"],
  airPressure: ["airpressure"],
  relativeHumidity: ["relativehumidity"],
  backStrokeLength: ["backstrokelength"],
  forwardStrokeLength: ["forwardstrokelength"],
  targetBackswingTime: ["targetbackswingtime"],
  targetDownswingTime: ["targetdownswingtime"],
  backswingTime: ["backswingtime"],
  downswingTime: ["downswingtime"],
  targetTempo: ["targettempo"],
  swingTempo: ["swingtempo"],
} as const;

/**
 * Without these the file is not usable as a session. Club identity is special
 * cased: either "Club Name" or "Club Type" will do.
 */
const REQUIRED: FieldKey[] = ["carryDistance"];

/** Missing these degrades the analysis but does not block the upload. */
const RECOMMENDED: FieldKey[] = [
  "clubSpeed",
  "ballSpeed",
  "smashFactor",
  "clubPath",
  "clubFace",
  "carryDeviationDistance",
];

const DISTANCE_FIELDS: FieldKey[] = [
  "carryDistance",
  "carryDeviationDistance",
  "totalDistance",
  "totalDeviationDistance",
  "apexHeight",
];
const SPEED_FIELDS: FieldKey[] = ["clubSpeed", "ballSpeed"];

const PRETTY: Record<FieldKey, string> = {
  date: "Date", player: "Player", clubName: "Club Name", clubType: "Club Type",
  clubSpeed: "Club Speed", attackAngle: "Attack Angle", clubPath: "Club Path",
  clubFace: "Club Face", faceToPath: "Face to Path", ballSpeed: "Ball Speed",
  smashFactor: "Smash Factor", launchAngle: "Launch Angle",
  launchDirection: "Launch Direction", backspin: "Backspin", sidespin: "Sidespin",
  spinRate: "Spin Rate", spinAxis: "Spin Axis", apexHeight: "Apex Height",
  carryDistance: "Carry Distance", carryDeviationAngle: "Carry Deviation Angle",
  carryDeviationDistance: "Carry Deviation Distance", totalDistance: "Total Distance",
  totalDeviationAngle: "Total Deviation Angle",
  totalDeviationDistance: "Total Deviation Distance", note: "Note", tags: "Tag(s)",
  brandModel: "Brand/Model", spinRateType: "Spin Rate Type",
  targetTotalDistance: "Target Total Distance", targetCarryDistance: "Target Carry Distance",
  airDensity: "Air Density", temperature: "Temperature", airPressure: "Air Pressure",
  relativeHumidity: "Relative Humidity", backStrokeLength: "Back Stroke Length",
  forwardStrokeLength: "Forward Stroke Length", targetBackswingTime: "Target Backswing Time",
  targetDownswingTime: "Target Downswing Time", backswingTime: "Backswing Time",
  downswingTime: "Downswing Time", targetTempo: "Target Tempo", swingTempo: "Swing Tempo",
};

function num(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "" || s === "-" || s === "--" || s.toLowerCase() === "n/a") return null;
  // Strip thousands separators and any trailing unit text.
  const cleaned = s.replace(/,/g, "").replace(/[^0-9.+-eE]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * R10 dates are usually ISO ("2026-03-31 14:22:05"). Slash formats are
 * ambiguous, so day-first is assumed unless the numbers rule it out, and a
 * warning is recorded.
 */
function parseDate(raw: unknown, warnings: string[]): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    let [, a, b, y, hh, mm, ss] = m;
    let day = Number(a), month = Number(b);
    if (Number(a) > 12) { day = Number(a); month = Number(b); }
    else if (Number(b) > 12) { day = Number(b); month = Number(a); }
    else {
      const w = "Dates use a slash format that is ambiguous (e.g. 03/04). Read as day/month.";
      if (!warnings.includes(w)) warnings.push(w);
    }
    const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    const d = new Date(year, month - 1, day, Number(hh ?? 0), Number(mm ?? 0), Number(ss ?? 0));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Row 2 of a real export is a units row: every populated cell is a bracketed
 * unit like "[mph]" or "[Yards]". Detected rather than assumed by position,
 * since not every export includes one.
 */
function isUnitsRow(row: Record<string, string> | undefined): boolean {
  if (!row) return false;
  const values = Object.values(row).map((v) => String(v ?? "").trim()).filter(Boolean);
  return values.length > 0 && values.every((v) => /^\[.*\]$/.test(v));
}

export function parseR10Csv(text: string): ParseResult {
  const warnings: string[] = [];
  // Real exports start with a UTF-8 BOM.
  const body = text.replace(/^\uFEFF/, "").trim();
  const parsed = Papa.parse<Record<string, string>>(body, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });

  const headers = parsed.meta.fields ?? [];

  // Map each field key to the actual header string in this file.
  const found = new Map<FieldKey, string>();
  const usedHeaders = new Set<string>();
  for (const key of Object.keys(FIELD_ALIASES) as FieldKey[]) {
    const aliases: readonly string[] = FIELD_ALIASES[key];
    const match = headers.find((h) => !usedHeaders.has(h) && aliases.includes(normalise(h)));
    if (match) {
      found.set(key, match);
      usedHeaders.add(match);
    }
  }

  const missingHeaders = REQUIRED.filter((k) => !found.has(k)).map((k) => PRETTY[k]);
  // Either column can identify a club; only their absence together is fatal.
  if (!found.has("clubName") && !found.has("clubType")) {
    missingHeaders.push("Club Name or Club Type");
  }
  const unmappedHeaders = headers.filter((h) => !usedHeaders.has(h));

  for (const k of RECOMMENDED) {
    if (!found.has(k)) {
      warnings.push(`No "${PRETTY[k]}" column found. Analysis that relies on it is skipped.`);
    }
  }

  // Units live in the units row when there is one; otherwise fall back to
  // suffixes on the headers themselves.
  const rows = parsed.data;
  const unitsRow = isUnitsRow(rows[0]) ? rows[0] : null;
  const dataRows = unitsRow ? rows.slice(1) : rows;

  const unitFor = (key: FieldKey): string => {
    const header = found.get(key);
    if (unitsRow && header) return String(unitsRow[header] ?? "").toLowerCase();
    return header?.toLowerCase() ?? "";
  };
  const unitBlob = unitsRow
    ? Object.values(unitsRow).join(" ").toLowerCase()
    : headers.join(" ").toLowerCase();

  const carryUnit = unitFor("carryDistance") || unitBlob;
  const distanceUnit: "yards" | "metres" =
    /\byd|yard/.test(carryUnit) ? "yards"
      : /\[\s*m\s*\]|\bmeters\b|\bmetres\b/.test(carryUnit) ? "metres"
      : "yards";

  const speedUnitRaw = unitFor("clubSpeed") || unitBlob;
  const speedUnit: "mph" | "kph" = /kph|km\/h/.test(speedUnitRaw) ? "kph" : "mph";

  if (missingHeaders.length > 0) {
    return {
      shots: [], sessionDate: null, dates: [], warnings, unmappedHeaders,
      missingHeaders, units: { distance: distanceUnit, speed: speedUnit },
    };
  }

  const get = (row: Record<string, string>, key: FieldKey): number | null => {
    const header = found.get(key);
    if (!header) return null;
    let v = num(row[header]);
    if (v === null) return null;
    if (distanceUnit === "metres" && DISTANCE_FIELDS.includes(key)) v *= YARDS_PER_METRE;
    if (speedUnit === "kph" && SPEED_FIELDS.includes(key)) v *= MPH_PER_KPH;
    return v;
  };

  const dateSet = new Set<string>();
  const shots: Shot[] = [];
  let skipped = 0;

  dataRows.forEach((row, i) => {
    const clubTypeRaw = found.has("clubType")
      ? String(row[found.get("clubType")!] ?? "").trim() || null
      : null;
    // "Club Name" is the user's own label and is usually blank; "Club Type"
    // carries the club ("7 Iron"). Prefer the label when it is set.
    const label = found.has("clubName")
      ? String(row[found.get("clubName")!] ?? "").trim()
      : "";
    const clubName = label || clubTypeRaw || "";

    const carry = get(row, "carryDistance");
    if (!clubName || carry === null) {
      skipped++;
      return;
    }

    const d = parseDate(found.has("date") ? row[found.get("date")!] : null, warnings);
    if (d) dateSet.add(ymd(d));

    let smash = get(row, "smashFactor");
    const clubSpeed = get(row, "clubSpeed");
    const ballSpeed = get(row, "ballSpeed");
    // Some exports omit smash factor; it is exactly ball speed / club speed.
    if (smash === null && ballSpeed !== null && clubSpeed !== null && clubSpeed > 0) {
      smash = ballSpeed / clubSpeed;
    }

    let faceToPath = get(row, "faceToPath");
    const clubFace = get(row, "clubFace");
    const clubPath = get(row, "clubPath");
    if (faceToPath === null && clubFace !== null && clubPath !== null) {
      faceToPath = clubFace - clubPath;
    }

    shots.push({
      shotIndex: i,
      hitAt: d ? d.toISOString() : null,
      shotDate: d ? ymd(d) : null,
      clubName,
      clubTypeRaw,
      clubCategory: clubCategory(clubName, clubTypeRaw),
      clubSpeed,
      attackAngle: get(row, "attackAngle"),
      clubPath,
      clubFace,
      faceToPath,
      ballSpeed,
      smashFactor: smash,
      launchAngle: get(row, "launchAngle"),
      launchDirection: get(row, "launchDirection"),
      backspin: get(row, "backspin"),
      sidespin: get(row, "sidespin"),
      spinRate: get(row, "spinRate"),
      spinAxis: get(row, "spinAxis"),
      apexHeight: get(row, "apexHeight"),
      carryDistance: carry,
      carryDeviationAngle: get(row, "carryDeviationAngle"),
      carryDeviationDistance: get(row, "carryDeviationDistance"),
      totalDistance: get(row, "totalDistance"),
      totalDeviationAngle: get(row, "totalDeviationAngle"),
      totalDeviationDistance: get(row, "totalDeviationDistance"),
      quality: "ok",
      qualitySource: "auto",
      isShortGame: false,
    });
  });

  if (skipped > 0) {
    warnings.push(`${skipped} row${skipped === 1 ? "" : "s"} skipped: no club name or no carry distance.`);
  }
  if (distanceUnit === "metres") {
    warnings.push("File is in metres. Distances converted to yards.");
  }
  if (speedUnit === "kph") {
    warnings.push("File is in km/h. Speeds converted to mph.");
  }

  const dates = [...dateSet].sort();
  if (dates.length > 1) {
    warnings.push(`File spans ${dates.length} dates (${dates[0]} to ${dates[dates.length - 1]}). Each date is saved as its own session.`);
  }

  return {
    shots,
    sessionDate: dates[0] ?? null,
    dates,
    warnings,
    unmappedHeaders,
    missingHeaders: [],
    units: { distance: distanceUnit, speed: speedUnit },
  };
}

/** Split a parsed file into one shot list per calendar date. */
export function splitByDate(shots: Shot[]): { date: string | null; shots: Shot[] }[] {
  const buckets = new Map<string, Shot[]>();
  for (const s of shots) {
    const key = s.shotDate ?? "";
    const b = buckets.get(key);
    if (b) b.push(s);
    else buckets.set(key, [s]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date: date || null, shots: list }));
}
