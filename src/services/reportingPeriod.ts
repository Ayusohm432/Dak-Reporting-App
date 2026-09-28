
import { format } from "date-fns";

/**
 * Reporting month format:
 * YYYY-MM
 *
 * Example: September 2026 = "2026-09"
 *
 * The month represents the END month of the reporting period.
 */

/**
 * Converts a month number into a two-digit string.
 */
function padMonth(month: number): string {
  return String(month).padStart(2, "0");
}

/**
 * Validates the year and month.
 *
 * Month must be between 1 and 12.
 */
function validateYearAndMonth(
  year: number,
  month: number
): void {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new Error("Year must be between 1900 and 9999.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }
}

/**
 * Creates a reporting month key.
 *
 * Example:
 * getReportingMonthKey(2026, 9) => "2026-09"
 */
export function getReportingMonthKey(
  year: number,
  month: number
): string {
  validateYearAndMonth(year, month);

  return `${year}-${padMonth(month)}`;
}

/**
 * Reads a reporting month key.
 *
 * Example:
 * parseReportingMonth("2026-09")
 * => { year: 2026, month: 9 }
 */
export function parseReportingMonth(
  reportingMonth: string
): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(reportingMonth);

  if (!match) {
    throw new Error(
      "Invalid reporting month. Expected YYYY-MM."
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  validateYearAndMonth(year, month);

  return { year, month };
}

/**
 * Generates the reporting period.
 *
 * Rule:
 * Start = 26th of the previous month
 * End   = 25th of the selected month
 *
 * The month argument is 1-based:
 * January = 1, December = 12.
 *
 * Example:
 * getReportingPeriod(2026, 9)
 * => "26/08/2026-25/09/2026"
 */
export function getReportingPeriod(
  year: number,
  month: number
): string {
  validateYearAndMonth(year, month);

  const startDate = new Date(
    year,
    month - 2,
    26
  );

  const endDate = new Date(
    year,
    month - 1,
    25
  );

  const formattedStart = format(
    startDate,
    "dd/MM/yyyy"
  );

  const formattedEnd = format(
    endDate,
    "dd/MM/yyyy"
  );

  return `${formattedStart}-${formattedEnd}`;
}

/**
 * Generates a reporting period from a YYYY-MM key.
 *
 * Example:
 * getReportingPeriodFromKey("2026-09")
 * => "26/08/2026-25/09/2026"
 */
export function getReportingPeriodFromKey(
  reportingMonth: string
): string {
  const { year, month } =
    parseReportingMonth(reportingMonth);

  return getReportingPeriod(year, month);
}

/**
 * Returns the default 26th-to-25th reporting range for the current month.
 */
export function getDefaultReportingPeriodDates(
  now: Date = new Date()
): { startDate: Date; endDate: Date } {
  return {
    startDate: new Date(now.getFullYear(), now.getMonth() - 1, 26),
    endDate: new Date(now.getFullYear(), now.getMonth(), 25),
  };
}

/**
 * Formats a user-selected reporting date range as dd/MM/yyyy-dd/MM/yyyy.
 */
export function formatReportingPeriod(
  startDate: Date,
  endDate: Date
): string {
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw new Error("Reporting period dates must be valid.");
  }

  if (startDate > endDate) {
    throw new Error("Reporting period start date must not be after its end date.");
  }

  return `${format(startDate, "dd/MM/yyyy")}-${format(endDate, "dd/MM/yyyy")}`;
}

/**
 * Returns a readable reporting month.
 *
 * Example:
 * formatReportingMonth("2026-09")
 * => "September 2026"
 */
export function formatReportingMonth(
  reportingMonth: string
): string {
  const { year, month } =
    parseReportingMonth(reportingMonth);

  return format(
    new Date(year, month - 1, 1),
    "MMMM yyyy"
  );
}

/**
 * Returns the current calendar month in YYYY-MM format.
 *
 * An optional date can be supplied for testing.
 */
export function getCurrentReportingMonth(
  now: Date = new Date()
): string {
  return getReportingMonthKey(
    now.getFullYear(),
    now.getMonth() + 1
  );
}
