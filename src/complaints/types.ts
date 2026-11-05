import type { Complaint, Order, ReporterRow, Rules, WmsReturn } from '../pack/types.ts';
import type { TrackingReading } from '../tracking/types.ts';

export type Definition = 'A' | 'B';

export type NotCandidateCode = 'NOT_WATCHED_STATE' | 'WINDOW_NOT_REACHED' | 'DATA_INCOMPLETE';

export type BlockCode =
  | 'EXCLUDED_SHIPPING_METHOD'
  | 'COMPLAINT_EXISTS'
  | 'RETURN_EXISTS'
  | 'NO_REPORTER';

export type RulesDecision =
  | { kind: 'not_candidate'; orderId: string; code: NotCandidateCode; detail: string }
  | {
      kind: 'blocked';
      orderId: string;
      definition: Definition;
      blocks: [BlockCode, ...BlockCode[]];
      detail: string;
    }
  | {
      kind: 'eligible';
      orderId: string;
      definition: Definition;
      complaintReason: string;
      reporter: string;
    };

export type GateCode =
  | 'TRACKING_CONFIRMS_STUCK'
  | 'TRACKING_CONFIRMS_NOT_PICKED_UP'
  | 'TRACKING_CARRIER_HAS_IT'
  | 'TRACKING_DELIVERED'
  | 'TRACKING_RETURNING'
  | 'TRACKING_UNKNOWN'
  | 'TRACKING_UNAVAILABLE';

export type FinalDecision =
  | {
      action: 'FILE';
      code: GateCode;
      rules: Extract<RulesDecision, { kind: 'eligible' }>;
      tracking: TrackingReading;
    }
  | {
      action: 'NEEDS_HUMAN';
      code: GateCode;
      rules: Extract<RulesDecision, { kind: 'eligible' }>;
      tracking: TrackingReading | null;
    }
  | {
      action: 'DO_NOT_FILE';
      code: GateCode | NotCandidateCode | BlockCode;
      rules: RulesDecision;
      tracking: TrackingReading | null;
    };

export interface DecideContext {
  asOf: Date;
  rules: Rules;
  complaints: Complaint[];
  returns: WmsReturn[];
  reporters: ReporterRow[];
}

export type Decide = (order: Order, ctx: DecideContext) => RulesDecision;
export type Gate = (rules: RulesDecision, tracking: TrackingReading | null) => FinalDecision;
