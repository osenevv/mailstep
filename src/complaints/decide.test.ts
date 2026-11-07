import { describe, expect, it } from 'vitest';
import { decide } from './decide.ts';
import { asOf, complaint, ctx, order, reporter, rules, wmsReturn } from './fixtures.ts';
import type { RulesDecision } from './types.ts';

function code(decision: RulesDecision): string {
  if (decision.kind === 'blocked') return decision.blocks.join(',');
  if (decision.kind === 'not_candidate') return decision.code;
  return decision.kind;
}

describe('decide', () => {
  it('I-window: exactly 14 d is eligible', () => {
    const decision = decide(
      order({
        stateEnteredAt: '2026-10-20T07:00:00+02:00',
        clientId: 'CL-LUMEN',
        carrier: 'Rychlopost',
      }),
      ctx({ reporters: [reporter()] }),
    );
    expect(decision.kind).toBe('eligible');
  });

  it('I-window: 1 min under 14 d is not', () => {
    const decision = decide(
      order({ stateEnteredAt: '2026-10-20T07:01:00+02:00', clientId: 'CL-LUMEN' }),
      ctx({ asOf, reporters: [reporter()] }),
    );
    expect(code(decision)).toBe('WINDOW_NOT_REACHED');
  });

  it('I-window: 2 d + 1 h is eligible on the rules', () => {
    const decision = decide(
      order({
        state: 'čeká na dopravce',
        stateEnteredAt: '2026-11-01T05:00:00+01:00',
        clientId: 'CL-LUMEN',
      }),
      ctx({ reporters: [reporter()] }),
    );
    expect(decision.kind).toBe('eligible');
    if (decision.kind === 'eligible') expect(decision.definition).toBe('A');
  });

  it('I-exclusions: no-tracking service allowed for A and excluded for B', () => {
    const method = 'Rychlopost Ekonom bez sledování';
    const allowed = decide(
      order({
        state: 'čeká na dopravce',
        stateEnteredAt: '2026-10-30T06:00:00+01:00',
        shippingMethod: method,
        clientId: 'CL-LUMEN',
      }),
      ctx({ reporters: [reporter()] }),
    );
    const excluded = decide(
      order({ shippingMethod: method, clientId: 'CL-LUMEN' }),
      ctx({ reporters: [reporter()] }),
    );
    expect(allowed.kind).toBe('eligible');
    expect(code(excluded)).toBe('EXCLUDED_SHIPPING_METHOD');
  });

  it('I-exclusions: internal transport excluded for both', () => {
    const reporters = [reporter()];
    const a = decide(
      order({
        state: 'čeká na dopravce',
        stateEnteredAt: '2026-10-30T06:00:00+01:00',
        shippingMethod: 'interní přeprava',
        clientId: 'CL-LUMEN',
      }),
      ctx({ reporters }),
    );
    const b = decide(
      order({ shippingMethod: 'interní přeprava', clientId: 'CL-LUMEN' }),
      ctx({ reporters }),
    );
    expect(code(a)).toBe('EXCLUDED_SHIPPING_METHOD');
    expect(code(b)).toBe('EXCLUDED_SHIPPING_METHOD');
  });

  it('I-complaint-block: koncept blocks', () => {
    const decision = decide(
      order(),
      ctx({ complaints: [complaint({ state: 'koncept' })] }),
    );
    expect(code(decision)).toBe('COMPLAINT_EXISTS');
  });

  it('I-complaint-block: uzavřená blocks', () => {
    const decision = decide(
      order(),
      ctx({ complaints: [complaint({ state: 'uzavřená' })] }),
    );
    expect(code(decision)).toBe('COMPLAINT_EXISTS');
  });

  it('I-complaint-block: other order of same client does not block', () => {
    const decision = decide(
      order({ clientId: 'CL-LUMEN' }),
      ctx({
        reporters: [reporter()],
        complaints: [complaint({ orderId: 'MS-2026-000901', clientId: 'CL-LUMEN' })],
      }),
    );
    expect(decision.kind).toBe('eligible');
  });

  it('I-return-block: Připraveno blocks', () => {
    expect(
      code(decide(order({ clientId: 'CL-LUMEN' }), ctx({ reporters: [reporter()], returns: [wmsReturn()] }))),
    ).toBe('RETURN_EXISTS');
  });

  it('I-return-block: any other state blocks', () => {
    expect(
      code(
        decide(
          order({ clientId: 'CL-LUMEN' }),
          ctx({ reporters: [reporter()], returns: [wmsReturn({ state: 'přijato na sklad' })] }),
        ),
      ),
    ).toBe('RETURN_EXISTS');
  });

  it('I-large-client: matrix hit', () => {
    const decision = decide(
      order({ clientId: 'CL-LUMEN', carrier: 'Rychlopost' }),
      ctx({ reporters: [reporter(), reporter({ carrier: '*', reporter: 'Někdo Jiný' })] }),
    );
    expect(decision.kind).toBe('eligible');
    if (decision.kind === 'eligible') expect(decision.reporter).toBe('Eva Králová');
  });

  it('I-large-client: exact carrier beats star', () => {
    const decision = decide(
      order({ clientId: 'CL-LUMEN', carrier: 'Rychlopost' }),
      ctx({
        reporters: [
          reporter({ carrier: '*', reporter: 'Hvězda' }),
          reporter({ carrier: 'Rychlopost', reporter: 'Eva Králová' }),
        ],
      }),
    );
    if (decision.kind === 'eligible') expect(decision.reporter).toBe('Eva Králová');
  });

  it('I-large-client: no matching row is NO_REPORTER', () => {
    const decision = decide(
      order({ clientId: 'CL-NIVA', carrier: 'VeloCorriere' }),
      ctx({ reporters: [reporter({ clientId: 'CL-NIVA', carrier: 'PaketNet', reporter: 'Martin Holub' })] }),
    );
    expect(code(decision)).toBe('NO_REPORTER');
  });

  it('I-last-reporter: latest wins', () => {
    const decision = decide(
      order({ id: 'MS-2026-000253', clientId: 'CL-BOR' }),
      ctx({
        complaints: [
          complaint({
            id: 'C-old',
            orderId: 'MS-2026-000801',
            reporter: 'Jana Bor',
            createdAt: '2026-09-01T10:00:00+02:00',
          }),
          complaint({
            id: 'C-new',
            orderId: 'MS-2026-000802',
            reporter: 'Petr Bor',
            createdAt: '2026-10-01T10:00:00+02:00',
          }),
        ],
      }),
    );
    expect(decision.kind).toBe('eligible');
    if (decision.kind === 'eligible') expect(decision.reporter).toBe('Petr Bor');
  });

  it('I-last-reporter: no history is NO_REPORTER', () => {
    expect(code(decide(order({ clientId: 'CL-MISA' }), ctx()))).toBe('NO_REPORTER');
  });

  it('I-data-incomplete: missing stateEnteredAt', () => {
    expect(code(decide(order({ stateEnteredAt: null }), ctx()))).toBe('DATA_INCOMPLETE');
  });

  it('I-data-incomplete: empty clientId', () => {
    expect(code(decide(order({ clientId: '' }), ctx()))).toBe('DATA_INCOMPLETE');
  });

  it('I-data-incomplete: unparseable timestamp', () => {
    expect(code(decide(order({ stateEnteredAt: 'včera' }), ctx()))).toBe('DATA_INCOMPLETE');
  });

  it('NOT_WATCHED_STATE for doručeno and expedováno', () => {
    expect(code(decide(order({ state: 'doručeno' }), ctx()))).toBe('NOT_WATCHED_STATE');
    expect(code(decide(order({ state: 'expedováno' }), ctx()))).toBe('NOT_WATCHED_STATE');
  });

  it('several blocks at once stay in BlockCode order', () => {
    const decision = decide(
      order({ shippingMethod: 'interní přeprava', clientId: 'CL-MISA' }),
      ctx({ returns: [wmsReturn()] }),
    );
    expect(decision.kind).toBe('blocked');
    if (decision.kind === 'blocked') {
      expect(decision.blocks).toEqual([
        'EXCLUDED_SHIPPING_METHOD',
        'RETURN_EXISTS',
        'NO_REPORTER',
      ]);
    }
  });

  it('complaint reason comes from rules', () => {
    const decision = decide(
      order({ clientId: 'CL-LUMEN' }),
      ctx({ reporters: [reporter()] }),
    );
    if (decision.kind === 'eligible') {
      expect(decision.complaintReason).toBe(rules.definitions.B.complaintReason);
    }
  });

  it('I-now: asOf comes from the caller', () => {
    const early = decide(
      order({ stateEnteredAt: '2026-10-20T07:00:00+02:00', clientId: 'CL-LUMEN' }),
      ctx({
        asOf: asOf,
        reporters: [reporter()],
      }),
    );
    const beforeWindow = decide(
      order({ stateEnteredAt: '2026-10-20T07:00:00+02:00', clientId: 'CL-LUMEN' }),
      ctx({
        asOf: new Date(asOf.getTime() - 60 * 1000),
        reporters: [reporter()],
      }),
    );
    expect(early.kind).toBe('eligible');
    expect(code(beforeWindow)).toBe('WINDOW_NOT_REACHED');
  });

  it('reports all 4 blocks simultaneously in strict order when all fail', () => {
    // 1. Excluded method
    // 2. Complaint exists
    // 3. Return exists
    // 4. No reporter (CL-MISA has no matrix entry and complaints list has no reporter for it)
    const o = order({
      id: 'MS-EXTREME-BLOCKS',
      clientId: 'CL-MISA',
      shippingMethod: 'interní přeprava',
    });
    const decision = decide(
      o,
      ctx({
        complaints: [complaint({ orderId: 'MS-EXTREME-BLOCKS', clientId: 'CL-MISA', reporter: null })],
        returns: [wmsReturn({ orderId: 'MS-EXTREME-BLOCKS' })],
        reporters: [], // large client check false, small client history has no reporter
      }),
    );
    expect(decision.kind).toBe('blocked');
    if (decision.kind === 'blocked') {
      expect(decision.blocks).toEqual([
        'EXCLUDED_SHIPPING_METHOD',
        'COMPLAINT_EXISTS',
        'RETURN_EXISTS',
        'NO_REPORTER',
      ]);
      expect(decision.detail).toContain('vyloučený');
      expect(decision.detail).toContain('existuje reklamace');
      expect(decision.detail).toContain('vratka');
      expect(decision.detail).toContain('Nelze určit reportéra');
    }
  });

  it('rejects future timestamp as WINDOW_NOT_REACHED with negative elapsed time', () => {
    const futureOrder = order({
      stateEnteredAt: '2026-11-10T06:00:00+01:00', // 7 days in the future relative to asOf
      clientId: 'CL-LUMEN',
    });
    const decision = decide(futureOrder, ctx({ asOf, reporters: [reporter()] }));
    expect(decision.kind).toBe('not_candidate');
    if (decision.kind === 'not_candidate') {
      expect(decision.code).toBe('WINDOW_NOT_REACHED');
      expect(decision.detail).toContain('−');
    }
  });

  it('handles whitespace-only clientId and stateEnteredAt as DATA_INCOMPLETE', () => {
    const blankClient = decide(order({ clientId: '   ' }), ctx());
    expect(blankClient.kind).toBe('not_candidate');
    if (blankClient.kind === 'not_candidate') {
      expect(blankClient.code).toBe('DATA_INCOMPLETE');
      expect(blankClient.detail).toBe('Chybí klient.');
    }

    const blankTime = decide(order({ stateEnteredAt: '   ', clientId: 'CL-LUMEN' }), ctx());
    expect(blankTime.kind).toBe('not_candidate');
    if (blankTime.kind === 'not_candidate') {
      expect(blankTime.code).toBe('DATA_INCOMPLETE');
      expect(blankTime.detail).toBe('Chybí čas vstupu do stavu.');
    }

    const bothBlank = decide(order({ clientId: '  ', stateEnteredAt: '  ' }), ctx());
    expect(bothBlank.kind).toBe('not_candidate');
    if (bothBlank.kind === 'not_candidate') {
      expect(bothBlank.code).toBe('DATA_INCOMPLETE');
      expect(bothBlank.detail).toBe('Chybí klient a čas vstupu do stavu.');
    }
  });

  it('rejects completely unknown order states as NOT_WATCHED_STATE', () => {
    for (const st of ['storno', 'reklamováno', 'archivováno', 'neznámý stav', '123']) {
      const decision = decide(order({ state: st as any, clientId: 'CL-LUMEN' }), ctx());
      expect(code(decision)).toBe('NOT_WATCHED_STATE');
    }
  });

  it('tie-breaks identical millisecond complaint timestamps deterministically by complaint ID', () => {
    const sameTime = '2026-10-01T12:00:00.000Z';
    const decision = decide(
      order({ id: 'MS-TIE-TEST', clientId: 'CL-SMALL' }),
      ctx({
        complaints: [
          complaint({ id: 'C-001', clientId: 'CL-SMALL', reporter: 'Alice', createdAt: sameTime }),
          complaint({ id: 'C-002', clientId: 'CL-SMALL', reporter: 'Bob', createdAt: sameTime }),
        ],
      }),
    );
    expect(decision.kind).toBe('eligible');
    if (decision.kind === 'eligible') {
      // C-002 localeCompare C-001 is positive, b.id.localeCompare(a.id) picks C-002
      expect(decision.reporter).toBe('Bob');
    }
  });
});
