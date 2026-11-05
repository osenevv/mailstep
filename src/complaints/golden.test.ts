import { expect, it } from 'vitest';
import { loadPack } from '../pack/load.ts';
import { readTracking } from '../tracking/read.ts';
import { decide } from './decide.ts';
import { expectedOrders } from './expected.ts';
import { gate } from './gate.ts';

it('every planted order matches the frozen oracle', () => {
  const pack = loadPack('data');
  expect(expectedOrders).toHaveLength(pack.orders.length);
  for (const row of expectedOrders) {
    const order = pack.orders.find((item) => item.id === row.orderId);
    expect(order, row.orderId).toBeDefined();
    if (!order) continue;
    const rules = decide(order, {
      asOf: pack.exportedAt,
      rules: pack.rules,
      complaints: pack.complaints,
      returns: pack.returns,
      reporters: pack.reporters,
    });
    const html = order.trackingNumber ? pack.trackingHtml(order.trackingNumber) : null;
    const tracking = rules.kind === 'eligible' && html !== null ? readTracking(html) : null;
    const decision = gate(rules, tracking);
    const codes = rules.kind === 'blocked' ? rules.blocks.join(',') : decision.code;
    expect({ id: order.id, action: decision.action, codes }).toEqual({
      id: row.orderId,
      action: row.action,
      codes: row.codes,
    });
  }
});
