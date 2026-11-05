import type { Complaint, Order, ReporterRow, Rules, WmsReturn } from '../pack/types.ts';
import type { DecideContext } from './types.ts';
import { parseTimestamp } from './window.ts';

export const rules: Rules = {
  definitions: {
    A: {
      orderState: 'čeká na dopravce',
      minDays: 2,
      excludedMethods: ['interní přeprava'],
      complaintReason: 'nevyzvednuto dopravcem',
    },
    B: {
      orderState: 'převzato dopravcem',
      minDays: 14,
      excludedMethods: [
        'interní přeprava',
        'Rychlopost Ekonom bez sledování',
        'PaketNet Obyčejný balík',
      ],
      complaintReason: 'ztráta',
    },
  },
};

export const asOf = parseTimestamp('2026-11-03T06:00:00+01:00') as Date;

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'MS-2026-000001',
    clientId: 'CL-BOR',
    state: 'převzato dopravcem',
    stateEnteredAt: '2026-10-10T06:00:00+02:00',
    shippingMethod: 'Rychlopost Standard',
    carrier: 'Rychlopost',
    trackingNumber: null,
    ...overrides,
  };
}

export function ctx(overrides: Partial<DecideContext> = {}): DecideContext {
  return {
    asOf,
    rules,
    complaints: [],
    returns: [],
    reporters: [],
    ...overrides,
  };
}

export function complaint(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: 'C-1',
    orderId: 'MS-2026-000001',
    clientId: 'CL-BOR',
    state: 'otevřená',
    reporter: 'Petr Bor',
    createdAt: '2026-10-01T10:00:00+02:00',
    ...overrides,
  };
}

export function wmsReturn(overrides: Partial<WmsReturn> = {}): WmsReturn {
  return { id: 'R-1', orderId: 'MS-2026-000001', state: 'Připraveno', ...overrides };
}

export function reporter(overrides: Partial<ReporterRow> = {}): ReporterRow {
  return { clientId: 'CL-LUMEN', carrier: 'Rychlopost', reporter: 'Eva Králová', ...overrides };
}
