export type TrackingStatus = 'doručeno' | 'v přepravě' | 'vrací se' | 'nevím';

export type UnknownCause =
  | 'no_carrier_events'
  | 'unrecognized_template'
  | 'unknown_carrier'
  | 'conflicting_events'
  | 'error_page'
  | 'empty';

export type TrackingReading =
  | {
      status: 'doručeno' | 'v přepravě' | 'vrací se';
      carrier: string;
      ruleId: string;
      evidence: string;
    }
  | {
      status: 'nevím';
      cause: UnknownCause;
      carrier: string | null;
      ruleId: string;
      evidence: string | null;
    };

export type ReadTracking = (html: string) => TrackingReading;
