import type { Order } from '../pack/types.ts';
import { complaintBlocks, returnBlocks } from './blocks.ts';
import { assessWindow, definitionFor } from './eligibility.ts';
import { resolveReporter } from './reporter.ts';
import type { BlockCode, DecideContext, RulesDecision } from './types.ts';
import { formatElapsed } from './window.ts';

export function decide(order: Order, ctx: DecideContext): RulesDecision {
  const incomplete = incompleteDetail(order);
  if (incomplete) {
    return { kind: 'not_candidate', orderId: order.id, code: 'DATA_INCOMPLETE', detail: incomplete };
  }

  const definition = definitionFor(order.state, ctx.rules);
  if (!definition) {
    return {
      kind: 'not_candidate',
      orderId: order.id,
      code: 'NOT_WATCHED_STATE',
      detail: `Stav „${order.state}“ se nesleduje.`,
    };
  }

  const rule = ctx.rules.definitions[definition];
  const window = assessWindow(order.stateEnteredAt as string, rule.minDays, ctx.asOf);
  if (!window) {
    return {
      kind: 'not_candidate',
      orderId: order.id,
      code: 'DATA_INCOMPLETE',
      detail: 'Chybí nebo je nečitelný čas vstupu do stavu.',
    };
  }
  if (!window.open) {
    return {
      kind: 'not_candidate',
      orderId: order.id,
      code: 'WINDOW_NOT_REACHED',
      detail: `${formatElapsed(window.elapsed)} < ${rule.minDays} d`,
    };
  }

  const blocks: BlockCode[] = [];
  if (rule.excludedMethods.includes(order.shippingMethod)) blocks.push('EXCLUDED_SHIPPING_METHOD');
  if (complaintBlocks(order.id, ctx.complaints)) blocks.push('COMPLAINT_EXISTS');
  if (returnBlocks(order.id, ctx.returns)) blocks.push('RETURN_EXISTS');
  const reporter = resolveReporter(order.clientId, order.carrier, ctx.reporters, ctx.complaints);
  if (!reporter) blocks.push('NO_REPORTER');

  if (blocks.length > 0) {
    return {
      kind: 'blocked',
      orderId: order.id,
      definition,
      blocks: blocks as [BlockCode, ...BlockCode[]],
      detail: blocks.map((code) => blockSentence(code, order, definition)).join(' '),
    };
  }

  return {
    kind: 'eligible',
    orderId: order.id,
    definition,
    complaintReason: rule.complaintReason,
    reporter: reporter as string,
  };
}

function incompleteDetail(order: Order): string | null {
  const missingClient = order.clientId.trim() === '';
  const missingTime = order.stateEnteredAt === null || order.stateEnteredAt.trim() === '';
  if (missingClient && missingTime) return 'Chybí klient a čas vstupu do stavu.';
  if (missingClient) return 'Chybí klient.';
  if (missingTime) return 'Chybí čas vstupu do stavu.';
  return null;
}

function blockSentence(code: BlockCode, order: Order, definition: 'A' | 'B'): string {
  switch (code) {
    case 'EXCLUDED_SHIPPING_METHOD':
      return `Způsob dopravy „${order.shippingMethod}“ je pro definici ${definition} vyloučený.`;
    case 'COMPLAINT_EXISTS':
      return 'K objednávce už existuje reklamace.';
    case 'RETURN_EXISTS':
      return 'Ve WMS je k objednávce vratka.';
    case 'NO_REPORTER':
      return 'Nelze určit reportéra.';
  }
}
