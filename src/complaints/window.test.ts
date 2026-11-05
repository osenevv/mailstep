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
});
