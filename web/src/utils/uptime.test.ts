import { describe, it, expect } from 'vitest';
import { calculateRunningDays, PROJECT_LAUNCHED_AT } from './uptime';

describe('calculateRunningDays Authenticity Suite (R1.2)', () => {
  const FIXED_TODAY = '2026-09-18';

  it('exports canonical project launch metadata', () => {
    expect(PROJECT_LAUNCHED_AT).toBe('2026-09-12');
  });

  // Test 1 — Valid official date
  it('calculates true running days for valid launch date (Test 1)', () => {
    const days = calculateRunningDays('2026-09-12', FIXED_TODAY);
    expect(days).toBe(7);
  });

  // Test 2 — Missing launchedAt (undefined / null)
  it('uses canonical PROJECT_LAUNCHED_AT when launchedAt is undefined (Test 2a)', () => {
    const days = calculateRunningDays(undefined, FIXED_TODAY);
    expect(days).toBe(7);
  });

  it('uses canonical PROJECT_LAUNCHED_AT when launchedAt is null (Test 2b)', () => {
    const days = calculateRunningDays(null, FIXED_TODAY);
    expect(days).toBe(7);
  });

  // Test 3 — Empty string
  it('returns null for empty string without falling back to canonical metadata (Test 3a)', () => {
    const days = calculateRunningDays('', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for whitespace string without falling back to canonical metadata (Test 3b)', () => {
    const days = calculateRunningDays('   ', FIXED_TODAY);
    expect(days).toBeNull();
  });

  // Test 4 — Malformed strings
  it('returns null for malformed string "abc" (Test 4a)', () => {
    const days = calculateRunningDays('abc', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for malformed string "invalid-date" (Test 4b)', () => {
    const days = calculateRunningDays('invalid-date', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for malformed month out of range "2026-99-99" (Test 4c)', () => {
    const days = calculateRunningDays('2026-99-99', FIXED_TODAY);
    expect(days).toBeNull();
  });

  // Test 5 — Impossible calendar dates (JS Date rollover prevention)
  it('returns null for impossible date "2026-02-31" without rolling over to March (Test 5a)', () => {
    const days = calculateRunningDays('2026-02-31', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for impossible month "2026-13-01" (Test 5b)', () => {
    const days = calculateRunningDays('2026-13-01', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for impossible April 31 "2026-04-31" (Test 5c)', () => {
    const days = calculateRunningDays('2026-04-31', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for February 29 on a non-leap year "2026-02-29" (Test 5d)', () => {
    const days = calculateRunningDays('2026-02-29', FIXED_TODAY);
    expect(days).toBeNull();
  });

  // Test 6 — Future dates
  it('returns null for distant future date "2099-01-01" without clamping to 1 (Test 6a)', () => {
    const days = calculateRunningDays('2099-01-01', FIXED_TODAY);
    expect(days).toBeNull();
  });

  it('returns null for near future date "2026-09-19" when today is 2026-09-18 (Test 6b)', () => {
    const days = calculateRunningDays('2026-09-19', FIXED_TODAY);
    expect(days).toBeNull();
  });

  // Additional boundary and leap year tests
  it('returns 1 for same-day launch (day 1 of operation)', () => {
    const days = calculateRunningDays('2026-09-18', FIXED_TODAY);
    expect(days).toBe(1);
  });

  it('correctly validates leap day "2024-02-29" on a leap year', () => {
    const days = calculateRunningDays('2024-02-29', '2024-03-01');
    expect(days).toBe(2);
  });

  it('accepts Date objects for today parameter', () => {
    const todayDate = new Date(Date.UTC(2026, 8, 18));
    const days = calculateRunningDays('2026-09-12', todayDate);
    expect(days).toBe(7);
  });

  it('returns null for invalid today input', () => {
    expect(calculateRunningDays('2026-09-12', 'invalid-today')).toBeNull();
    expect(calculateRunningDays('2026-09-12', new Date('invalid'))).toBeNull();
  });

  it('computes positive number when today is omitted (default to now)', () => {
    const days = calculateRunningDays('2026-09-12');
    expect(typeof days).toBe('number');
    expect(days).toBeGreaterThanOrEqual(1);
  });
});
