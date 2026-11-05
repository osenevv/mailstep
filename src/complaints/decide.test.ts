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
});
