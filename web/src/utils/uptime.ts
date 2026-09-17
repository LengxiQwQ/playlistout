/**
 * Canonical product release metadata for PlaylistOut.
 * PlaylistOut Web officially launched on 2026-09-12 (v2.0.0 official release).
 */
export const PROJECT_LAUNCHED_AT = '2026-09-12';

/**
 * Calculates genuine elapsed running days since the project launch date.
 *
 * Strict Authenticity Contract:
 * - If launchDate is undefined or null (missing field), use the canonical metadata PROJECT_LAUNCHED_AT.
 * - If launchDate is an invalid string (empty, non-date, impossible calendar date like 2026-02-31), return null.
 * - If launchDate is in the future relative to today, return null (never clamp with Math.max(1, ...)).
 * - Return null for unknown/uncomputable states. Callers should render "暂无数据" / "unavailable"
 *   instead of fabricating positive integers like "1 day".
 *
 * @param launchDate - ISO date string (YYYY-MM-DD), or undefined/null for missing field
 * @param today - Current date for calculation (Date or YYYY-MM-DD string), defaults to current UTC day
 * @returns Number of running days (>= 1) or null if invalid/future
 */
export function calculateRunningDays(
  launchDate?: string | null,
  today?: Date | string,
): number | null {
  const effectiveDate = launchDate === undefined || launchDate === null ? PROJECT_LAUNCHED_AT : launchDate;

  if (typeof effectiveDate !== 'string' || !effectiveDate.trim()) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(effectiveDate.trim());
  if (!match) {
    return null;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Prevent JavaScript Date rollover (e.g. 2026-02-31 rolling over into March 3)
  const launchParsed = new Date(Date.UTC(year, month - 1, day));
  if (
    launchParsed.getUTCFullYear() !== year ||
    launchParsed.getUTCMonth() !== month - 1 ||
    launchParsed.getUTCDate() !== day
  ) {
    return null;
  }

  let todayUtc: number;
  if (today === undefined || today === null) {
    const now = new Date();
    todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  } else if (today instanceof Date) {
    if (isNaN(today.getTime())) {
      return null;
    }
    todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  } else if (typeof today === 'string') {
    const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today.trim());
    if (!todayMatch) {
      return null;
    }
    const tYear = parseInt(todayMatch[1], 10);
    const tMonth = parseInt(todayMatch[2], 10);
    const tDay = parseInt(todayMatch[3], 10);
    if (tMonth < 1 || tMonth > 12 || tDay < 1 || tDay > 31) {
      return null;
    }
    const todayParsed = new Date(Date.UTC(tYear, tMonth - 1, tDay));
    if (
      todayParsed.getUTCFullYear() !== tYear ||
      todayParsed.getUTCMonth() !== tMonth - 1 ||
      todayParsed.getUTCDate() !== tDay
    ) {
      return null;
    }
    todayUtc = todayParsed.getTime();
  } else {
    return null;
  }

  const diffDays = Math.floor((todayUtc - launchParsed.getTime()) / (1000 * 60 * 60 * 24));
  // Future dates are invalid/unverifiable: never clamp via Math.max(1, ...)
  if (diffDays < 0) {
    return null;
  }

  return diffDays + 1;
}
