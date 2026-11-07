import { describe, expect, it } from 'vitest';
import type { FinalDecision } from '../complaints/types.ts';
import type { Complaint, Order } from '../pack/types.ts';
import { reconcileShadow } from './reconcile.ts';

function mockOrder(id: string): Order {
  return {
    id,
    clientId: 'CL-TEST',
    state: 'převzato dopravcem',
    stateEnteredAt: '2026-10-10T00:00:00+02:00',
    shippingMethod: 'Standard',
    carrier: 'Rychlopost',
    trackingNumber: `TRACK-${id}`,
  };
}

describe('reconcileShadow', () => {
  it('flags dangerous false claims if automation files on a delivered parcel', () => {
    const order = mockOrder('ORD-1');
    const decision: FinalDecision = {
      action: 'FILE',
      code: 'TRACKING_CONFIRMS_STUCK',
      rules: {
        kind: 'eligible',
        orderId: 'ORD-1',
        definition: 'B',
        complaintReason: 'ztráta',
        reporter: 'Jan Novák',
      },
      tracking: {
        status: 'doručeno', // simulated conflict
        carrier: 'Rychlopost',
        ruleId: 'test',
        evidence: 'Doručeno',
      },
    };

    const result = reconcileShadow([{ order, decision }], []);
    expect(result.dangerousFalseClaims).toBe(1);
    expect(result.flaggedOrders[0]?.issue).toBe('DANGEROUS_FALSE_CLAIM');
  });

  it('calculates precision and recall accurately', () => {
    const o1 = mockOrder('ORD-1');
    const o2 = mockOrder('ORD-2');

    const d1: FinalDecision = {
      action: 'FILE',
      code: 'TRACKING_CONFIRMS_STUCK',
      rules: {
        kind: 'eligible',
        orderId: 'ORD-1',
        definition: 'B',
        complaintReason: 'ztráta',
        reporter: 'Jan Novák',
      },
      tracking: {
        status: 'v přepravě',
        carrier: 'Rychlopost',
        ruleId: 'test',
        evidence: 'V přepravě',
      },
    };

    const d2: FinalDecision = {
      action: 'DO_NOT_FILE',
      code: 'WINDOW_NOT_REACHED',
      rules: {
        kind: 'not_candidate',
        orderId: 'ORD-2',
        code: 'WINDOW_NOT_REACHED',
        detail: 'under window',
      },
      tracking: null,
    };

    const actualComplaints: Complaint[] = [
      {
        id: 'C-1',
        orderId: 'ORD-1',
        clientId: 'CL-TEST',
        state: 'otevřená',
        reporter: 'Jan Novák',
        createdAt: '2026-11-03T07:00:00+01:00',
      },
    ];

    const result = reconcileShadow(
      [
        { order: o1, decision: d1 },
        { order: o2, decision: d2 },
      ],
      actualComplaints,
    );

    expect(result.bothFiled).toBe(1);
    expect(result.precision).toBe(100);
    expect(result.recall).toBe(100);
    expect(result.dangerousFalseClaims).toBe(0);
  });

  it('handles empty datasets cleanly without division by zero', () => {
    const result = reconcileShadow([], []);
    expect(result.total).toBe(0);
    expect(result.precision).toBe(100);
    expect(result.recall).toBe(100);
    expect(result.bothFiled).toBe(0);
    expect(result.automationOnly).toBe(0);
    expect(result.humanOnly).toBe(0);
    expect(result.neitherFiled).toBe(0);
  });

  it('does not treat koncept or zamítnutá complaints as filed by humans', () => {
    const o = mockOrder('ORD-99');
    const d: FinalDecision = {
      action: 'FILE',
      code: 'TRACKING_CONFIRMS_STUCK',
      rules: {
        kind: 'eligible',
        orderId: 'ORD-99',
        definition: 'B',
        complaintReason: 'ztráta',
        reporter: 'Jan Novák',
      },
      tracking: {
        status: 'v přepravě',
        carrier: 'Rychlopost',
        ruleId: 'test',
        evidence: 'V přepravě',
      },
    };
    const draftComplaint: Complaint = {
      id: 'C-DRAFT',
      orderId: 'ORD-99',
      clientId: 'CL-TEST',
      state: 'koncept', // draft!
      reporter: 'Jan Novák',
      createdAt: '2026-11-03T07:00:00+01:00',
    };
    const result = reconcileShadow([{ order: o, decision: d }], [draftComplaint]);
    // Since human complaint is only a draft, it is not counted as human filed
    expect(result.bothFiled).toBe(0);
    expect(result.automationOnly).toBe(1);
    expect(result.flaggedOrders[0]?.issue).toBe('AUTOMATION_DIVERGENCE');
  });

  it('deduplicates multiple human complaints for the same order', () => {
    const o = mockOrder('ORD-1');
    const d: FinalDecision = {
      action: 'FILE',
      code: 'TRACKING_CONFIRMS_STUCK',
      rules: {
        kind: 'eligible',
        orderId: 'ORD-1',
        definition: 'B',
        complaintReason: 'ztráta',
        reporter: 'Jan Novák',
      },
      tracking: {
        status: 'v přepravě',
        carrier: 'Rychlopost',
        ruleId: 'test',
        evidence: 'V přepravě',
      },
    };
    const multipleComplaints: Complaint[] = [
      {
        id: 'C-1',
        orderId: 'ORD-1',
        clientId: 'CL-TEST',
        state: 'otevřená',
        reporter: 'Jan Novák',
        createdAt: '2026-11-03T07:00:00+01:00',
      },
      {
        id: 'C-2',
        orderId: 'ORD-1',
        clientId: 'CL-TEST',
        state: 'v řešení',
        reporter: 'Jan Novák',
        createdAt: '2026-11-03T08:00:00+01:00',
      },
    ];
    const result = reconcileShadow([{ order: o, decision: d }], multipleComplaints);
    expect(result.bothFiled).toBe(1);
    expect(result.total).toBe(1);
  });
});
