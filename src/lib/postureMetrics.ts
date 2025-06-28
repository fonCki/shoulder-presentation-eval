// -----------------------------------------------------------------------------
// Posture metrics (v3 – 2025-06)
// -----------------------------------------------------------------------------
// Implements the two posture checks required by ISO/IEC 39794-5:
//   • horizontalScore   – shoulders square to the camera   (yaw)
//   • shoulderTiltScore – shoulders level in the image    (roll)
//
// Both metrics rely only on the left & right shoulder landmarks (indices
// 11 and 12 in MediaPipe Pose). No facial points are needed, so the algorithm
// still works when the face is partly occluded.
// -----------------------------------------------------------------------------

/* ─────────────────────────────── Types ─────────────────────────────── */

/** Minimal landmark as returned by MediaPipe Pose. */
export interface Landmark {
  x: number;              // normalised X (0 left … 1 right)
  y: number;              // normalised Y (0 top  … 1 bottom)
  z: number;              // normalised depth (larger = farther)
  visibility?: number;    // optional confidence [0,1]
}

/** Sparse array: key = landmark index, value = landmark. */
export interface PoseLandmarks {
  [idx: number]: Landmark;
}

/* ─────────────────────── Helpers & constants ──────────────────────── */

const L_SHOULDER = 11; // left shoulder index, as per MediaPipe Pose
const R_SHOULDER = 12; // right shoulder index, as per MediaPipe Pose

const VIS_THRESHOLD = 0.3;  // landmarks below this are unreliable
const EPSILON       = 1e-6; // avoids divide-by-zero

/** Landmark exists *and* is above VIS_THRESHOLD. */
function isVisible(l?: Landmark): boolean {
  return !!l && (l.visibility ?? 1) > VIS_THRESHOLD;
}

/* ───────────────────── Metric 1 – horizontalScore ──────────────────── */
/**
 * Shoulders square to the camera (yaw).
 * Returns a score in [0,1]. 1 = square-on, 0 = full profile.
 */
export function horizontalScore(lm: PoseLandmarks): number {
  return horizontalScoreDetailed(lm).score; // simple wrapper
}

/* ─────────── detailed variant – exposes raw terms for UI/debug ────────── */
export interface HorizontalScoreDebug {
  score: number;        // final score [0,1]
  angleDeg: number;     // yaw angle in degrees (0 = frontal, 90 = profile)
  dx: number;           // |Δx| horizontal shoulder gap
  dz: number;           // |Δz| depth gap
  visSym: number;       // visibility symmetry 0…1
  left:  { x: number; y: number; z: number; v: number };
  right: { x: number; y: number; z: number; v: number };
}

export function horizontalScoreDetailed(lm: PoseLandmarks): HorizontalScoreDebug {
  // Fallback object for undefined cases.
  const blank = (): HorizontalScoreDebug => ({
    score: 0, angleDeg: 90, dx: 0, dz: 0, visSym: 0,
    left:  { x: NaN, y: NaN, z: NaN, v: 0 },
    right: { x: NaN, y: NaN, z: NaN, v: 0 },
  });

  const ls = lm[L_SHOULDER];
  const rs = lm[R_SHOULDER];
  if (!isVisible(ls) || !isVisible(rs)) return blank();
  if (!Number.isFinite(ls.z) || !Number.isFinite(rs.z)) return blank(); // need depth

  const dx = ls.x - rs.x;
  const dz = ls.z - rs.z;
  const len = Math.hypot(dx, dz);
  if (len < EPSILON) return blank();

  const absDx  = Math.abs(dx);
  const absDz  = Math.abs(dz);
  const geom   = absDx / len; // cos θ
  const visSym = 1 - Math.abs((ls.visibility ?? 1) - (rs.visibility ?? 1));
  const angle  = Math.atan2(absDz, absDx) * 180 / Math.PI;

  return {
    score: geom * visSym,
    angleDeg: angle,
    dx: absDx,
    dz: absDz,
    visSym,
    left:  { x: ls.x, y: ls.y, z: ls.z, v: ls.visibility ?? 0 },
    right: { x: rs.x, y: rs.y, z: rs.z, v: rs.visibility ?? 0 },
  };
}

/* ─────────────────── Metric 2 – shoulderTiltScore ─────────────────── */
/**
 * Shoulders level in the image (roll).
 * Returns 1 when the shoulder line is horizontal, 0 when vertical.
 */
export function shoulderTiltScore(lm: PoseLandmarks): number {
  const ls = lm[L_SHOULDER];
  const rs = lm[R_SHOULDER];
  if (!isVisible(ls) || !isVisible(rs)) return 0;

  const dx = ls.x - rs.x;
  const dy = ls.y - rs.y;
  if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON) return 0; // degenerate

  const angle = Math.atan2(Math.abs(dy), Math.abs(dx)); // 0 … π/2
  return 1 - angle / (Math.PI / 2);
}

/* ---------- Combined Metric ---------- */

/**
 * Computes a single "shoulder squareness" quality score by combining
 * the horizontal (yaw) and tilt (roll) scores using their geometric mean.
 * A low score in either metric will result in a low final score.
 *
 * @param lm The pose landmarks.
 * @returns A single quality score q in [0,1].
 */
export function shoulderSquareness(lm: PoseLandmarks): number {
  const sYaw = horizontalScore(lm);
  const sRoll = shoulderTiltScore(lm);

  // The geometric mean ensures a penalty if either score is low.
  const q = Math.sqrt(sYaw * sRoll);

  // Ensure the result is a valid number.
  return Number.isNaN(q) ? 0 : q;
}

/* ───────────────────────── Convenience wrapper ─────────────────────── */
/** Compute all metrics in one call, including the combined score. */
export function computeAllMetrics(lm: PoseLandmarks) {
  const sYaw = horizontalScore(lm);
  const sRoll = shoulderTiltScore(lm);
  const q = Math.sqrt(sYaw * sRoll);

  return {
    horizontalScore:   sYaw,
    shoulderTiltScore: sRoll,
    // combinedScore:     Number.isNaN(q) ? 0 : q, // Excluded from this general wrapper; this value is used specifically for the EDC curve analysis in the paper.
  } as const;
}
