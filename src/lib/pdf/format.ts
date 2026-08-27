import { format as formatDateFns } from "date-fns";

/**
 * The sample prescription PDF shows a bare "0.00" for a zero-power lens
 * (no sign) -- there's no non-zero sample to confirm against, but every
 * real-world optical prescription convention signs non-zero sph/cyl/add
 * explicitly (plus vs minus lens is clinically load-bearing), so that's
 * applied here: zero stays unsigned, everything else gets +/-.
 */
export function formatPowerForPdf(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (num === 0) return "0.00";
  const sign = num < 0 ? "-" : "+";
  return `${sign}${Math.abs(num).toFixed(2)}`;
}

export function formatAxisForPdf(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * The stored option value is "N6" (matching the handwritten clinical
 * spec), but the supplied sample PDF renders it as "N-6" -- the PDF's
 * layout/format is authoritative for PDF output specifically, so the
 * hyphen is inserted only at render time, not in the stored value or
 * anywhere else in the app.
 */
export function formatNearVaForPdf(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^N(\d+)$/.exec(value);
  return match ? `N-${match[1]}` : value;
}

export function formatDateForPdf(isoDate: string): string {
  return formatDateFns(new Date(`${isoDate}T00:00:00`), "dd/MM/yyyy");
}
