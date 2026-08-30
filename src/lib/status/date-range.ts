import { format, subDays } from "date-fns";

/**
 * Date-range presets for the Status page. A range always *ends* on the
 * selected date (inclusive) and reaches `days` back from it, so the existing
 * day-by-day navigation and the range filter share one anchor date.
 */
export const STATUS_RANGES = [
  { value: "day", label: "This day", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "14d", label: "Last 14 days", days: 14 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "Overall", days: null },
] as const;

export type StatusRange = (typeof STATUS_RANGES)[number]["value"];

export const DEFAULT_STATUS_RANGE: StatusRange = "day";

export function parseStatusRange(value: string | undefined): StatusRange {
  return STATUS_RANGES.some((r) => r.value === value)
    ? (value as StatusRange)
    : DEFAULT_STATUS_RANGE;
}

export function statusRangeLabel(range: StatusRange): string {
  return STATUS_RANGES.find((r) => r.value === range)!.label;
}

/**
 * Resolves a range + anchor date into inclusive `yyyy-MM-dd` bounds.
 * "Overall" has no bounds, so both are null and the query is unfiltered.
 */
export function resolveStatusRange(
  range: StatusRange,
  endDate: string,
): { start: string | null; end: string | null } {
  const days = STATUS_RANGES.find((r) => r.value === range)!.days;
  if (days === null) return { start: null, end: null };

  const end = new Date(`${endDate}T00:00:00`);
  return { start: format(subDays(end, days - 1), "yyyy-MM-dd"), end: endDate };
}

/** Builds a `/status` URL, keeping whichever of the two params is not being changed. */
export function statusHref({ date, range }: { date: string; range: StatusRange }): string {
  const params = new URLSearchParams({ date });
  if (range !== DEFAULT_STATUS_RANGE) params.set("range", range);
  return `/status?${params.toString()}`;
}
