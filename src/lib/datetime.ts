/**
 * IST (Asia/Kolkata) date helpers.
 *
 * The DB stores `order_date` as `timestamp without time zone DEFAULT now()`.
 * Supabase/Postgres runs in UTC, so those stored strings are UTC wall-clock
 * values WITHOUT a timezone suffix (e.g. "2026-06-05 20:30:00"). Passing such a
 * string to `new Date(...)` parses it as the browser's LOCAL time, which is the
 * root cause of the admin "order appeared on the wrong day" bug.
 *
 * India uses a fixed offset of UTC+5:30 with no daylight saving, so we can treat
 * the offset as a constant. Everything here standardizes on IST.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/** Fixed IST offset (UTC+5:30) in milliseconds. India has no DST. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MS_PER_DAY = 86_400_000;

/**
 * Parse a value coming from the DB. A bare timestamp (no `Z` / no `+hh:mm`) is
 * treated as UTC, which is how Postgres `now()` produces it.
 */
export function parseDbDateAsUtc(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw);
  const isoBody = raw.includes("T") ? raw : raw.replace(" ", "T");
  const isoString = hasTimezone ? isoBody : `${isoBody}Z`;

  const parsed = new Date(isoString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The IST calendar-day index (whole days since the Unix epoch, measured on the
 * IST clock). Two instants share a day index iff they fall on the same IST date.
 */
export function istDayIndex(value: string | Date | null | undefined): number | null {
  const date = parseDbDateAsUtc(value);
  if (!date) return null;
  return Math.floor((date.getTime() + IST_OFFSET_MS) / MS_PER_DAY);
}

/**
 * IST day index for a `YYYY-MM-DD` string (e.g. an admin date-picker value),
 * interpreting the date as an IST calendar date.
 */
export function istDayIndexFromDateInput(input: string): number | null {
  if (!input) return null;
  const parsed = Date.parse(`${input}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  return Math.floor(parsed / MS_PER_DAY);
}

/** Today's IST calendar-day index. */
export function todayIstDayIndex(now: Date = new Date()): number {
  return Math.floor((now.getTime() + IST_OFFSET_MS) / MS_PER_DAY);
}

/** True when today's IST day is after the given date's IST calendar day. */
export function isPastIstCalendarDay(
  value: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  const day = istDayIndex(value);
  const today = todayIstDayIndex(now);
  if (day === null) return true;
  return today > day;
}

const istDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const istDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const istTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Format a DB timestamp as an IST date (dd/mm/yyyy). */
export function formatIstDate(value: string | Date | null | undefined): string | null {
  const date = parseDbDateAsUtc(value);
  return date ? istDateFormatter.format(date) : null;
}

/** Format a DB timestamp as an IST date + time. */
export function formatIstDateTime(value: string | Date | null | undefined): string | null {
  const date = parseDbDateAsUtc(value);
  return date ? istDateTimeFormatter.format(date) : null;
}

/** Format a DB timestamp as an IST time-of-day. */
export function formatIstTime(value: string | Date | null | undefined): string | null {
  const date = parseDbDateAsUtc(value);
  return date ? istTimeFormatter.format(date) : null;
}
