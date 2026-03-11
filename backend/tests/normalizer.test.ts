import { computeEngagementRate, safeInt } from '../src/ingest/normalizer';

describe('computeEngagementRate', () => {
  it('returns 0 when followers is 0', () => {
    expect(computeEngagementRate(1000000, 100, 0)).toBe(0);
  });

  it('returns 0 when videoCount is 0', () => {
    expect(computeEngagementRate(1000000, 0, 100000)).toBe(0);
  });

  it('returns 0 when videoCount is null', () => {
    expect(computeEngagementRate(1000000, null, 100000)).toBe(0);
  });

  it('computes correctly for known values', () => {
    // 1,000,000 total views / 10 videos = 100,000 avg views
    // 100,000 avg views / 1,000,000 followers = 0.1
    const rate = computeEngagementRate(1_000_000, 10, 1_000_000);
    expect(rate).toBe(0.1);
  });

  it('caps at 1.0 for viral content', () => {
    const rate = computeEngagementRate(100_000_000, 1, 100);
    expect(rate).toBe(1.0);
  });

  it('returns a value with at most 4 decimal places', () => {
    const rate = computeEngagementRate(333333, 3, 1000000);
    expect(String(rate).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });
});

describe('safeInt', () => {
  it('parses a valid string integer', () => {
    expect(safeInt('42')).toBe(42);
  });

  it('parses a number', () => {
    expect(safeInt(100)).toBe(100);
  });

  it('returns 0 for null', () => {
    expect(safeInt(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(safeInt(undefined)).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(safeInt('not-a-number')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(safeInt('')).toBe(0);
  });

  it('truncates floats', () => {
    expect(safeInt('3.9')).toBe(3);
  });
});
