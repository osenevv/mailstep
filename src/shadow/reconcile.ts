import type { FinalDecision } from '../complaints/types.ts';
import type { Complaint, Order } from '../pack/types.ts';

export interface ReconcileResult {
  total: number;
  bothFiled: number;
  automationOnly: number;
  humanOnly: number;
  neitherFiled: number;
  precision: number;
  recall: number;
  dangerousFalseClaims: number;
  flaggedOrders: Array<{
    orderId: string;
    clientId: string;
    automationAction: string;
    automationCode: string;
    humanFiled: boolean;
    trackingStatus: string | null;
    issue: 'DANGEROUS_FALSE_CLAIM' | 'AUTOMATION_DIVERGENCE' | 'HUMAN_OVERRIDE';
  }>;
}

export function reconcileShadow(
  decisions: Array<{ order: Order; decision: FinalDecision }>,
  actualComplaints: Complaint[],
): ReconcileResult {
  const filedOrderIds = new Set(
    actualComplaints
      .filter((c) => c.state !== 'koncept' && c.state !== 'zamítnutá')
      .map((c) => c.orderId),
  );

  let bothFiled = 0;
  let automationOnly = 0;
  let humanOnly = 0;
  let neitherFiled = 0;
  let dangerousFalseClaims = 0;

  const flaggedOrders: ReconcileResult['flaggedOrders'] = [];

  for (const { order, decision } of decisions) {
    const autoFiled = decision.action === 'FILE';
    const humanFiled = filedOrderIds.has(order.id);
    const trackingStatus = decision.tracking?.status ?? null;

    if (autoFiled && humanFiled) {
      bothFiled += 1;
    } else if (autoFiled && !humanFiled) {
      automationOnly += 1;
      const isDangerous = trackingStatus === 'doručeno' || trackingStatus === 'vrací se';
      if (isDangerous) dangerousFalseClaims += 1;

      flaggedOrders.push({
        orderId: order.id,
        clientId: order.clientId,
        automationAction: decision.action,
        automationCode: decision.code,
        humanFiled,
        trackingStatus,
        issue: isDangerous ? 'DANGEROUS_FALSE_CLAIM' : 'AUTOMATION_DIVERGENCE',
      });
    } else if (!autoFiled && humanFiled) {
      humanOnly += 1;
      flaggedOrders.push({
        orderId: order.id,
        clientId: order.clientId,
        automationAction: decision.action,
        automationCode: decision.code,
        humanFiled,
        trackingStatus,
        issue: 'HUMAN_OVERRIDE',
      });
    } else {
      neitherFiled += 1;
    }
  }

  const total = decisions.length;
  const precision = bothFiled + automationOnly > 0 ? (bothFiled / (bothFiled + automationOnly)) * 100 : 100;
  const recall = bothFiled + humanOnly > 0 ? (bothFiled / (bothFiled + humanOnly)) * 100 : 100;

  return {
    total,
    bothFiled,
    automationOnly,
    humanOnly,
    neitherFiled,
    precision: Number(precision.toFixed(1)),
    recall: Number(recall.toFixed(1)),
    dangerousFalseClaims,
    flaggedOrders,
  };
}
