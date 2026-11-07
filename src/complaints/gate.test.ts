import { expect, it } from 'vitest';
import { gate } from './gate.ts';
import type { RulesDecision } from './types.ts';
import type { TrackingReading } from '../tracking/types.ts';

const eligibleA: RulesDecision = {
  kind: 'eligible',
  orderId: 'A',
  definition: 'A',
  complaintReason: 'nevyzvednuto dopravcem',
  reporter: 'Eva Králová',
};
const eligibleB: RulesDecision = {
  kind: 'eligible',
  orderId: 'B',
  definition: 'B',
  complaintReason: 'ztráta',
  reporter: 'Eva Králová',
};

function reading(status: 'doručeno' | 'v přepravě' | 'vrací se'): TrackingReading {
  return { status, carrier: 'Rychlopost', ruleId: 'r', evidence: 'e' };
}

function unknown(
  cause: 'no_carrier_events' | 'empty' | 'error_page' | 'unrecognized_template' | 'conflicting_events' | 'unknown_carrier',
): TrackingReading {
  return { status: 'nevím', cause, carrier: 'Rychlopost', ruleId: 'r', evidence: null };
}

it('eligible B and in transit files', () => {
  expect(gate(eligibleB, reading('v přepravě'))).toMatchObject({
    action: 'FILE',
    code: 'TRACKING_CONFIRMS_STUCK',
  });
});

it('I-def-A-signal: no_carrier_events files A', () => {
  expect(gate(eligibleA, unknown('no_carrier_events'))).toMatchObject({
    action: 'FILE',
    code: 'TRACKING_CONFIRMS_NOT_PICKED_UP',
  });
});

it('eligible A and in transit does not file', () => {
  expect(gate(eligibleA, reading('v přepravě'))).toMatchObject({
    action: 'DO_NOT_FILE',
    code: 'TRACKING_CARRIER_HAS_IT',
  });
});

it('delivered does not file for A or B', () => {
  expect(gate(eligibleA, reading('doručeno')).code).toBe('TRACKING_DELIVERED');
  expect(gate(eligibleB, reading('doručeno')).code).toBe('TRACKING_DELIVERED');
});

it('returning does not file for A or B', () => {
  expect(gate(eligibleA, reading('vrací se')).code).toBe('TRACKING_RETURNING');
  expect(gate(eligibleB, reading('vrací se')).code).toBe('TRACKING_RETURNING');
});

it('I-def-A-signal: other unknown does not file', () => {
  expect(gate(eligibleB, unknown('empty'))).toMatchObject({ action: 'NEEDS_HUMAN', code: 'TRACKING_UNKNOWN' });
  expect(gate(eligibleA, unknown('error_page'))).toMatchObject({ action: 'NEEDS_HUMAN', code: 'TRACKING_UNKNOWN' });
  expect(gate(eligibleB, unknown('no_carrier_events'))).toMatchObject({
    action: 'NEEDS_HUMAN',
    code: 'TRACKING_UNKNOWN',
  });
});

it('I-tracking-link: missing file is TRACKING_UNAVAILABLE', () => {
  expect(gate(eligibleA, null)).toMatchObject({ action: 'NEEDS_HUMAN', code: 'TRACKING_UNAVAILABLE' });
  expect(gate(eligibleB, null)).toMatchObject({ action: 'NEEDS_HUMAN', code: 'TRACKING_UNAVAILABLE' });
});

it('a blocked order does not file', () => {
  const blocked: RulesDecision = {
    kind: 'blocked',
    orderId: 'X',
    definition: 'B',
    blocks: ['COMPLAINT_EXISTS'],
    detail: 'existuje',
  };
  expect(gate(blocked, reading('v přepravě'))).toMatchObject({
    action: 'DO_NOT_FILE',
    code: 'COMPLAINT_EXISTS',
    tracking: null,
  });
});

it('invariant: delivered or returning tracking status NEVER files a complaint', () => {
  const safeStatuses: Array<'doručeno' | 'vrací se'> = ['doručeno', 'vrací se'];
  for (const st of safeStatuses) {
    for (const d of [eligibleA, eligibleB]) {
      const res = gate(d, reading(st));
      expect(res.action).toBe('DO_NOT_FILE');
      expect(['TRACKING_DELIVERED', 'TRACKING_RETURNING']).toContain(res.code);
    }
  }
});

it('invariant: not_candidate rules decisions never file or escalate to human', () => {
  const notCandidateCodes = ['DATA_INCOMPLETE', 'NOT_WATCHED_STATE', 'WINDOW_NOT_REACHED'] as const;
  for (const c of notCandidateCodes) {
    const rulesDec: RulesDecision = {
      kind: 'not_candidate',
      orderId: 'NC-1',
      code: c,
      detail: 'test',
    };
    for (const st of ['doručeno', 'v přepravě', 'vrací se'] as const) {
      const res = gate(rulesDec, reading(st));
      expect(res.action).toBe('DO_NOT_FILE');
      expect(res.code).toBe(c);
      expect(res.tracking).toBeNull();
    }
    const resNull = gate(rulesDec, null);
    expect(resNull.action).toBe('DO_NOT_FILE');
    expect(resNull.code).toBe(c);
  }
});

it('invariant: unknown causes on definition B always result in NEEDS_HUMAN (never FILE)', () => {
  const allCauses: Array<'no_carrier_events' | 'empty' | 'error_page' | 'unrecognized_template' | 'conflicting_events' | 'unknown_carrier'> = [
    'no_carrier_events',
    'empty',
    'error_page',
    'unrecognized_template',
    'conflicting_events',
    'unknown_carrier',
  ];
  for (const cause of allCauses) {
    const res = gate(eligibleB, unknown(cause));
    expect(res.action).toBe('NEEDS_HUMAN');
    expect(res.code).toBe('TRACKING_UNKNOWN');
  }
});
