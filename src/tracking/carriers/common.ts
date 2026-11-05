import type { TrackingReading, TrackingStatus, UnknownCause } from '../types.ts';

export const CARRIER_NAME = {
  rychlopost: 'Rychlopost',
  paketnet: 'PaketNet',
  velocorriere: 'VeloCorriere',
  nordparcel: 'NordParcel',
} as const;

export type CarrierSlug = keyof typeof CARRIER_NAME;

export function known(status: TrackingStatus, slug: CarrierSlug, ruleId: string, evidence: string): TrackingReading {
  return {
    status: status as 'doručeno' | 'v přepravě' | 'vrací se',
    carrier: CARRIER_NAME[slug],
    ruleId: `${slug}.${ruleId}`,
    evidence: evidence.slice(0, 200),
  };
}

export function unknown(
  cause: UnknownCause,
  slug: CarrierSlug | null,
  ruleId: string,
  evidence: string | null,
): TrackingReading {
  return {
    status: 'nevím',
    cause,
    carrier: slug ? CARRIER_NAME[slug] : null,
    ruleId: slug ? `${slug}.${ruleId}` : ruleId,
    evidence: evidence === null ? null : evidence.slice(0, 200),
  };
}
