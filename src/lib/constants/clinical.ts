/**
 * Single source of truth for every clinical dropdown in the app. Never
 * duplicate these lists in a component -- import from here.
 */

/** Exported so callers can normalize a numeric DB value (e.g. "2.25", no
 * leading '+' -- Postgres doesn't retain it) back into the same signed
 * format these dropdown options use, so a saved value re-selects correctly. */
export function formatSignedPower(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded < 0 ? "-" : "+";
  return `${sign}${Math.abs(rounded).toFixed(2)}`;
}

function range(start: number, end: number, step: number): number[] {
  const count = Math.round((end - start) / step);
  return Array.from({ length: count + 1 }, (_, i) => Math.round((start + i * step) * 100) / 100);
}

/** Sphere: -20.00 to +20.00, 0.25 steps. */
export const sphereOptions = range(-20, 20, 0.25).map(formatSignedPower);

/** Cylinder: -5.00 to +5.00, 0.25 steps. */
export const cylinderOptions = range(-5, 5, 0.25).map(formatSignedPower);

/** Axis: 0 to 180 degrees, 1 degree steps. */
export const axisOptions = range(0, 180, 1).map((v) => String(v));

/** ADD: +0.00 to +4.00, 0.25 steps. */
export const addOptions = range(0, 4, 0.25).map(formatSignedPower);

/**
 * Distance visual acuity. Confirmed against the actual reference app's
 * dropdown (video walkthrough), which is richer than the handwritten spec
 * sheet -- includes PL PR Inaccurate/Accurate and (P) partial/pin variants
 * for every line from 6/36 down to 6/6.
 */
export const distanceVisualAcuityOptions = [
  "NO PL",
  "PL+",
  "PL PR Inaccurate",
  "PL PR Accurate",
  "HM+",
  "CF@3m",
  "CF@2m",
  "CF@1m",
  "6/60",
  "6/36(P)",
  "6/36",
  "6/24(P)",
  "6/24",
  "6/18(P)",
  "6/18",
  "6/12(P)",
  "6/12",
  "6/9(P)",
  "6/9",
  "6/6(P)",
  "6/6",
] as const;

/** Pin-hole uses the same acuity scale as distance vision. */
export const pinholeOptions = distanceVisualAcuityOptions;

/** Near visual acuity, per the handwritten clinical spec. */
export const nearVisualAcuityOptions = [
  "Not Able to Read",
  "N36",
  "N24",
  "N18",
  "N12",
  "N10",
  "N8",
  "N6",
] as const;

/** Only an overall result is captured -- no per-eye RE/LE breakdown. */
export const colorBlindnessOptions = ["Normal", "Abnormal"] as const;

/** Standard optometrist remarks, shown as a dropdown above the free-text remarks box. */
export const optometristRemarksOptions = [
  "Both Eyes: Normal Vision. Review after 6 months or 1 year",
  "Advised to use glasses and consult ophthalmologist for cyclo refraction / dilated retina examination",
  "Advised to use glasses for distance and near. Next visit after 6 months to 1 year",
  "Advised to use glasses for Near only",
  "Advised to use glasses for distance only",
  "Advised to use Protective glasses",
  "Advised to consult ophthalmologist for cataract surgery",
  "Advised to continue using same glasses and check up after 6 months to 1 year",
  "Advised to consult ophthalmologist for medical treatment",
  "Vision is not improving advised to consult ophthalmologist for further opinion",
] as const;
