import { describe, expect, it } from 'vitest';
import { elapsedMs, parseTimestamp, windowReached } from './window.ts';

const AS_OF = parseTimestamp('2026-11-03T06:00:00+01:00');

describe('I-window', () => {
  it('I-window: exactly 2 d is eligible', () => {
    const entered = parseTimestamp('2026-11-01T06:00:00+01:00');
    expect(entered).not.toBeNull();
    expect(AS_OF).not.toBeNull();
    const elapsed = elapsedMs(AS_OF!, entered!);
    expect(elapsed).toBe(2 * 24 * 60 * 60 * 1000);
    expect(windowReached(elapsed, 2)).toBe(true);
  });

  it('I-window: 1 ms under is not', () => {
    const entered = new Date(AS_OF!.getTime() - 2 * 24 * 60 * 60 * 1000 + 1);
    expect(windowReached(elapsedMs(AS_OF!, entered), 2)).toBe(false);
  });

  it('I-window: 1 min under 2 d is not', () => {
    const entered = parseTimestamp('2026-11-01T06:01:00+01:00');
    expect(windowReached(elapsedMs(AS_OF!, entered!), 2)).toBe(false);
  });

  it('I-window: exactly 14 d is eligible', () => {
    const entered = parseTimestamp('2026-10-20T07:00:00+02:00');
    const elapsed = elapsedMs(AS_OF!, entered!);
    expect(elapsed).toBe(14 * 24 * 60 * 60 * 1000);
    expect(windowReached(elapsed, 14)).toBe(true);
  });

  it('I-window: DST fall-back uses elapsed time', () => {
    const entered = parseTimestamp('2026-10-20T06:00:00+02:00');
    const elapsed = elapsedMs(AS_OF!, entered!);
    expect(elapsed).toBe(14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
    expect(windowReached(elapsed, 14)).toBe(true);
  });

  it('I-window: zoneless timestamp is Europe/Prague', () => {
    const zoneless = parseTimestamp('2026-11-01T06:00:00');
    const cet = parseTimestamp('2026-11-01T06:00:00+01:00');
    expect(zoneless?.toISOString()).toBe(cet?.toISOString());
  });

  it('I-window: spring gap is invalid', () => {
    expect(parseTimestamp('2026-03-29T02:30:00')).toBeNull();
  });

  it('I-window: ambiguous fall-back hour uses CET', () => {
    const parsed = parseTimestamp('2026-10-25T02:30:00');
    const cet = parseTimestamp('2026-10-25T02:30:00+01:00');
    expect(parsed?.toISOString()).toBe(cet?.toISOString());
  });

  it('I-window: parses microsecond timestamps and space-separated ISO strings', () => {
    const micro = parseTimestamp('2026-11-01T06:00:00.123456Z');
    expect(micro).not.toBeNull();
    const spaced = parseTimestamp('2026-11-01 06:00:00+01:00');
    expect(spaced).not.toBeNull();
  });

  it('I-window: handles extreme future timestamps (clock skew) safely', () => {
    const future = parseTimestamp('2026-11-05T06:00:00+01:00');
    expect(future).not.toBeNull();
    const elapsed = elapsedMs(AS_OF!, future!);
    expect(elapsed).toBeLessThan(0);
    expect(windowReached(elapsed, 2)).toBe(false);
    expect(windowReached(elapsed, 14)).toBe(false);
  });

  it('I-window: handles ancient timestamps (Unix epoch) without overflow', () => {
    const epoch = parseTimestamp('1970-01-01T00:00:00Z');
    expect(epoch).not.toBeNull();
    const elapsed = elapsedMs(AS_OF!, epoch!);
    expect(elapsed).toBeGreaterThan(0);
    expect(windowReached(elapsed, 14)).toBe(true);
  });

  it('I-window: handles negative timezone offsets correctly', () => {
    // New York EST (-05:00)
    const ny = parseTimestamp('2026-10-20T00:00:00-05:00');
    expect(ny).not.toBeNull();
    // 2026-10-20T05:00:00Z
    expect(ny?.toISOString()).toBe('2026-10-20T05:00:00.000Z');
  });

  it('I-window: leap year Feb 29 transition', () => {
    const leapDay = parseTimestamp('2024-02-29T12:00:00+01:00');
    expect(leapDay).not.toBeNull();
    const marchFirst = parseTimestamp('2024-03-01T12:00:00+01:00');
    expect(marchFirst).not.toBeNull();
    expect(elapsedMs(marchFirst!, leapDay!)).toBe(24 * 60 * 60 * 1000);
  });

  it('I-window: exact spring DST gap boundaries in Prague', () => {
    // 01:59:59 CET is valid
    expect(parseTimestamp('2026-03-29T01:59:59')).not.toBeNull();
    // 02:00:00 does not exist (clocks jump to 03:00:00)
    expect(parseTimestamp('2026-03-29T02:00:00')).toBeNull();
    // 02:59:59 does not exist
    expect(parseTimestamp('2026-03-29T02:59:59')).toBeNull();
    // 03:00:00 CEST is valid
    expect(parseTimestamp('2026-03-29T03:00:00')).not.toBeNull();
  });

  it('I-window: 14 d window exact 1 ms boundary', () => {
    const exact14d = 14 * 24 * 60 * 60 * 1000;
    expect(windowReached(exact14d - 1, 14)).toBe(false);
    expect(windowReached(exact14d, 14)).toBe(true);
    expect(windowReached(exact14d + 1, 14)).toBe(true);
  });

  it('I-window: rejects garbage or non-date strings', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('   ')).toBeNull();
    expect(parseTimestamp('not-a-date')).toBeNull();
    expect(parseTimestamp('2026-13-45T10:00:00Z')).toBeNull();
    expect(parseTimestamp('2026-11-01T25:00:00Z')).toBeNull();
  });
});
