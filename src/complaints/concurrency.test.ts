import { describe, expect, it } from 'vitest';
import { decide } from './decide.ts';
import { complaint, ctx, order, reporter, wmsReturn } from './fixtures.ts';
import { gate } from './gate.ts';
import { readTracking } from '../tracking/read.ts';

describe('Concurrency, Retries and Normalization Regressions', () => {
  it('prevents duplicate filings within the same batch when in-flight tracking is used', () => {
    const o = order({ id: 'MS-CONCURRENCY-1', clientId: 'CL-LUMEN', carrier: 'Rychlopost' });
    const inFlight = new Set<string>();

    const runDecision = () => {
      const effectiveComplaints = inFlight.has(o.id.trim())
        ? [
            complaint({
              id: 'in-flight-1',
              orderId: o.id.trim(),
              clientId: o.clientId,
              state: 'koncept',
            }),
          ]
        : [];
      const rules = decide(o, ctx({ reporters: [reporter()], complaints: effectiveComplaints }));
      const reading = readTracking(`<html><body><div data-carrier="rychlopost"><table class="rp-events"><tbody>
        <tr><td class="when">03.11.2026 08:00</td><td class="what">V přepravě</td></tr>
      </tbody></table></div></body></html>`);
      const finalDecision = gate(rules, reading);
      if (finalDecision.action === 'FILE') inFlight.add(o.id.trim());
      return finalDecision;
    };

    // First attempt: files complaint
    const first = runDecision();
    expect(first.action).toBe('FILE');
    expect(first.code).toBe('TRACKING_CONFIRMS_STUCK');

    // Second concurrent attempt (or duplicate entry in batch): blocked!
    const second = runDecision();
    expect(second.action).toBe('DO_NOT_FILE');
    expect(second.code).toBe('COMPLAINT_EXISTS');
  });

  it('trims orderId so whitespace does not bypass complaint block', () => {
    const o = order({ id: '  MS-2026-TRIM-1  ', clientId: 'CL-LUMEN' });
    const decision = decide(
      o,
      ctx({
        complaints: [complaint({ orderId: 'MS-2026-TRIM-1' })],
        reporters: [reporter()],
      }),
    );
    expect(decision.kind).toBe('blocked');
    if (decision.kind === 'blocked') {
      expect(decision.blocks).toContain('COMPLAINT_EXISTS');
    }
  });

  it('trims orderId so whitespace does not bypass return block', () => {
    const o = order({ id: '  MS-2026-TRIM-2  ', clientId: 'CL-LUMEN' });
    const decision = decide(
      o,
      ctx({
        returns: [wmsReturn({ orderId: 'MS-2026-TRIM-2' })],
        reporters: [reporter()],
      }),
    );
    expect(decision.kind).toBe('blocked');
    if (decision.kind === 'blocked') {
      expect(decision.blocks).toContain('RETURN_EXISTS');
    }
  });

  it('normalizes whitespace and casing in shippingMethod to prevent bypassing exclusions', () => {
    const excludedWithSpaces = decide(
      order({
        state: 'převzato dopravcem',
        shippingMethod: '   interní přeprava   ',
        clientId: 'CL-LUMEN',
      }),
      ctx({ reporters: [reporter()] }),
    );
    expect(excludedWithSpaces.kind).toBe('blocked');
    if (excludedWithSpaces.kind === 'blocked') {
      expect(excludedWithSpaces.blocks).toContain('EXCLUDED_SHIPPING_METHOD');
    }
  });

  it('chronologically sorts out-of-order carrier events so newer delivery wins over older in-transit', () => {
    // HTML table has older "V přepravě" at the top (row 0) and newer "Doručeno" below it (row 1)
    const outOfOrderHtml = `<!doctype html><html><body><div data-carrier="rychlopost">
      <table class="rp-events"><tbody>
        <tr><td class="when">01.11.2026 08:00</td><td class="what">V přepravě</td></tr>
        <tr><td class="when">03.11.2026 12:00</td><td class="what">Doručeno příjemci</td></tr>
      </tbody></table>
    </div></body></html>`;

    const reading = readTracking(outOfOrderHtml);
    // Must recognize the newest chronological event (Doručeno) rather than blindly picking row 0
    expect(reading.status).toBe('doručeno');
  });

  it('rejects missing or whitespace-only order id and carrier as DATA_INCOMPLETE', () => {
    const missingId = decide(order({ id: '   ', clientId: 'CL-LUMEN' }), ctx());
    expect(missingId.kind).toBe('not_candidate');
    if (missingId.kind === 'not_candidate') {
      expect(missingId.code).toBe('DATA_INCOMPLETE');
      expect(missingId.detail).toContain('identifikátor');
    }

    const missingCarrier = decide(order({ carrier: '   ', clientId: 'CL-LUMEN' }), ctx());
    expect(missingCarrier.kind).toBe('not_candidate');
    if (missingCarrier.kind === 'not_candidate') {
      expect(missingCarrier.code).toBe('DATA_INCOMPLETE');
      expect(missingCarrier.detail).toContain('dopravce');
    }
  });
});
