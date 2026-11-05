import type { Rules } from '../pack/types.ts';
import type { Definition } from './types.ts';
import { elapsedMs, parseTimestamp, windowReached } from './window.ts';

export function definitionFor(state: string, rules: Rules): Definition | null {
  if (state === rules.definitions.A.orderState) return 'A';
  if (state === rules.definitions.B.orderState) return 'B';
  return null;
}

export function assessWindow(
  stateEnteredAt: string,
  minDays: number,
  asOf: Date,
): { elapsed: number; open: boolean } | null {
  const entered = parseTimestamp(stateEnteredAt);
  if (!entered) return null;
  const elapsed = elapsedMs(asOf, entered);
  return { elapsed, open: windowReached(elapsed, minDays) };
}
