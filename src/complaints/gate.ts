import type { TrackingReading } from '../tracking/types.ts';
import type { FinalDecision, GateCode, RulesDecision } from './types.ts';

export function gate(rules: RulesDecision, tracking: TrackingReading | null): FinalDecision {
  if (rules.kind !== 'eligible') {
    return {
      action: 'DO_NOT_FILE',
      code: rules.kind === 'blocked' ? rules.blocks[0] : rules.code,
      rules,
      tracking: null,
    };
  }
  if (!tracking) {
    return { action: 'NEEDS_HUMAN', code: 'TRACKING_UNAVAILABLE', rules, tracking: null };
  }
  const code = gateCode(rules.definition, tracking);
  if (code === 'TRACKING_CONFIRMS_STUCK' || code === 'TRACKING_CONFIRMS_NOT_PICKED_UP') {
    return { action: 'FILE', code, rules, tracking };
  }
  if (code === 'TRACKING_UNKNOWN') {
    return { action: 'NEEDS_HUMAN', code, rules, tracking };
  }
  return { action: 'DO_NOT_FILE', code, rules, tracking };
}

function gateCode(definition: 'A' | 'B', tracking: TrackingReading): GateCode {
  if (tracking.status === 'doručeno') return 'TRACKING_DELIVERED';
  if (tracking.status === 'vrací se') return 'TRACKING_RETURNING';
  if (tracking.status === 'v přepravě') {
    return definition === 'B' ? 'TRACKING_CONFIRMS_STUCK' : 'TRACKING_CARRIER_HAS_IT';
  }
  if (tracking.status === 'nevím' && definition === 'A' && tracking.cause === 'no_carrier_events') {
    return 'TRACKING_CONFIRMS_NOT_PICKED_UP';
  }
  return 'TRACKING_UNKNOWN';
}
