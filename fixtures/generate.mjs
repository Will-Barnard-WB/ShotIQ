// Regenerates the test fixtures: `node fixtures/generate.mjs` from the repo root.
// Output is deterministic, so committed fixtures and test expectations stay in step.

import { writeFileSync } from "node:fs";

// Deterministic PRNG so fixtures never drift between runs.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260331);
const gauss = () => {
  const u = 1 - rnd(), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// Standardise then rescale, so each club's sample mean/sd hit the target exactly.
function fit(raw, targetMean, targetSd) {
  const n = raw.length;
  const m = raw.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(raw.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) || 1;
  return raw.map((v) => targetMean + targetSd * ((v - m) / sd));
}

/**
 * Each club is built from a latent shot-quality variable q. Metrics load on q
 * with different weights, which is what makes one of them the dominant
 * variable between the good and bad cohorts.
 */
function club(spec) {
  const n = spec.n;
  const q = Array.from({ length: n }, gauss);
  const noise = () => Array.from({ length: n }, gauss);
  const mix = (load) => {
    const e = noise();
    return q.map((qi, i) => load * qi + (1 - Math.abs(load)) * e[i]);
  };

  const carry = fit(mix(0.85), spec.carry, spec.carrySd);
  const smash = fit(mix(0.8), spec.smash, spec.smashSd);
  // Face loads heavily on q with little independent noise -> dominant variable.
  const face = fit(mix(spec.faceLoad ?? 0.95), spec.face, spec.faceSd);
  // Path is a standing swing bias here, uncorrelated with shot quality, which
  // is the situation the design describes: path is a constant fault, face is
  // what separates the good shots from the bad ones.
  const path = fit(mix(0), spec.path, spec.pathSd);
  const dev = fit(mix(0.8), spec.dev, spec.devSd);
  const aoa = fit(mix(0.15), spec.aoa, 1.6);
  const clubSpeed = fit(mix(0.35), spec.clubSpeed, spec.clubSpeedSd ?? 2.2);

  const rows = [];
  for (let i = 0; i < n; i++) {
    const ballSpeed = clubSpeed[i] * smash[i];
    const launch = spec.launch + gauss() * 1.5;
    rows.push({
      "Club Name": spec.name,
      "Club Type": spec.type,
      "Club Speed": clubSpeed[i].toFixed(1),
      "Attack Angle": aoa[i].toFixed(1),
      "Club Path": path[i].toFixed(1),
      "Club Face": face[i].toFixed(1),
      "Face to Path": (face[i] - path[i]).toFixed(1),
      "Ball Speed": ballSpeed.toFixed(1),
      "Smash Factor": smash[i].toFixed(2),
      "Launch Angle": launch.toFixed(1),
      "Launch Direction": (face[i] * 0.75 + path[i] * 0.25).toFixed(1),
      "Backspin": Math.round(spec.spin + gauss() * 400),
      "Sidespin": Math.round(face[i] * 120 + gauss() * 150),
      "Spin Rate": Math.round(spec.spin + gauss() * 400),
      "Spin Axis": (face[i] * 1.4).toFixed(1),
      "Apex Height": Math.max(3, spec.apex + gauss() * 4).toFixed(1),
      "Carry Distance": carry[i].toFixed(1),
      "Carry Deviation Angle": (dev[i] / Math.max(carry[i], 1) * 57.3).toFixed(1),
      "Carry Deviation Distance": dev[i].toFixed(1),
      "Total Distance": (carry[i] * spec.rollout).toFixed(1),
      "Total Deviation Angle": (dev[i] / Math.max(carry[i], 1) * 57.3).toFixed(1),
      "Total Deviation Distance": (dev[i] * 1.05).toFixed(1),
      "Note": "",
      "Tag(s)": "",
    });
  }
  return rows;
}

const HEADERS = [
  "Date","Player","Club Name","Club Type","Club Speed","Attack Angle","Club Path",
  "Club Face","Face to Path","Ball Speed","Smash Factor","Launch Angle","Launch Direction",
  "Backspin","Sidespin","Spin Rate","Spin Axis","Apex Height","Carry Distance",
  "Carry Deviation Angle","Carry Deviation Distance","Total Distance",
  "Total Deviation Angle","Total Deviation Distance","Note","Tag(s)",
];

function toCsv(rows, date) {
  const lines = [HEADERS.join(",")];
  rows.forEach((r, i) => {
    const mins = 9 + Math.floor(i * 1.7);
    const stamp = `${date} ${String(10 + Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00`;
    lines.push(HEADERS.map((h) => {
      if (h === "Date") return stamp;
      if (h === "Player") return "Will";
      return r[h] ?? "";
    }).join(","));
  });
  return lines.join("\n") + "\n";
}

// ---- Session 1: 38 shots. Numbers chosen to be the "before" side of the
// ---- comparisons quoted in the design's demo section.
const s1 = [
  ...club({ name:"5 Wood",     type:"5W", n:8,  carry:168, carrySd:26, smash:1.35, smashSd:0.09, face:-5.0,  faceSd:3.2, path:-6.0,  pathSd:1.3, dev:-12.0, devSd:14, aoa:-1.5, clubSpeed:88, launch:14, spin:3400, apex:24, rollout:1.09 }),
  ...club({ name:"7 Iron",     type:"7I", n:14, carry:128, carrySd:12, smash:1.18, smashSd:0.06, face:-5.1,  faceSd:3.0, path:-12.1, pathSd:1.2, dev:-14.0, devSd:11, aoa:-2.0, clubSpeed:78, launch:19, spin:5200, apex:22, rollout:1.06 }),
  ...club({ name:"8 Iron",     type:"8I", n:12, carry:117, carrySd:13, smash:1.13, smashSd:0.07, face:-11.4, faceSd:3.4, path:-9.0,  pathSd:1.2, dev:-20.3, devSd:12, aoa:-2.2, clubSpeed:74, launch:21, spin:5800, apex:21, rollout:1.05 }),
  // Only 4 shots: too few to split into good and bad.
  ...club({ name:"Sand Wedge", type:"SW", n:4,  carry:30,  carrySd:11, smash:1.02, smashSd:0.09, face:-2.0,  faceSd:2.4, path:-4.0,  pathSd:1.1, dev:-3.0,  devSd:4,  aoa:-3.0, clubSpeed:44, launch:29, spin:6900, apex:11, rollout:1.03 }),
];

// ---- Session 2: 47 shots, 31 March 2026.
const s2 = [
  ...club({ name:"5 Wood",     type:"5W", n:9,  carry:165, carrySd:28, smash:1.32, smashSd:0.10, face:-4.0,  faceSd:3.0, path:-4.8,  pathSd:1.2, dev:-10.0, devSd:12, aoa:-1.3, clubSpeed:89, launch:14, spin:3350, apex:25, rollout:1.09 }),
  ...club({ name:"7 Iron",     type:"7I", n:15, carry:132, carrySd:11, smash:1.20, smashSd:0.05, face:-2.8,  faceSd:2.9, path:-10.1, pathSd:1.1, dev:-8.0,  devSd:9,  aoa:-2.1, clubSpeed:79, launch:19, spin:5150, apex:23, rollout:1.06 }),
  ...club({ name:"8 Iron",     type:"8I", n:12, carry:124, carrySd:10, smash:1.21, smashSd:0.05, face:-2.8,  faceSd:2.6, path:-7.5,  pathSd:1.0, dev:-2.7,  devSd:7,  aoa:-2.3, clubSpeed:75, launch:21, spin:5700, apex:22, rollout:1.05 }),
  ...club({ name:"9 Iron",     type:"9I", n:5,  carry:110, carrySd:12, smash:1.16, smashSd:0.08, face:-5.0,  faceSd:3.0, path:-7.0,  pathSd:1.1, dev:-9.0,  devSd:9,  aoa:-2.5, clubSpeed:72, launch:23, spin:6300, apex:21, rollout:1.04 }),
  // Chipping: 11-51 yd spread around a 27.8 yd average.
  ...club({ name:"Sand Wedge", type:"SW", n:6,  carry:27.8,carrySd:13, smash:1.04, smashSd:0.10, face:-1.0,  faceSd:2.2, path:-3.5,  pathSd:1.0, dev:-0.8,  devSd:3,  aoa:-3.1, clubSpeed:45, launch:30, spin:7000, apex:11, rollout:1.03 }),
];

writeFileSync("fixtures/session-1.csv", toCsv(s1, "2026-03-17"));
writeFileSync("fixtures/session-2.csv", toCsv(s2, "2026-03-31"));

// A file with one header renamed, for the "fail loudly" parser test.
const broken = toCsv(s2, "2026-03-31").replace("Carry Distance,", "Carry Dist Yards,");
writeFileSync("fixtures/session-2-renamed-header.csv", broken);

console.log("session-1:", s1.length, "shots  session-2:", s2.length, "shots");
