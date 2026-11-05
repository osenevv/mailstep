import type { TrackingReading, TrackingStatus } from '../tracking/types.ts';

export type Split = 'dev' | 'holdout';

export interface MeasuredPage {
  file: string;
  carrier: string;
  split: Split;
  label: TrackingStatus;
  reading: TrackingReading;
}

export type Bucket =
  | 'correct'
  | 'dangerous'
  | 'suppressing'
  | 'abstention'
  | 'overconfident'
  | 'other_miss';

export interface Tally {
  pages: number;
  agree: number;
  buckets: Record<Bucket, number>;
}

export interface Report {
  total: number;
  bySplit: Record<Split, Tally>;
  byCarrier: Record<string, Tally>;
  confusion: Record<TrackingStatus, Record<TrackingStatus, number>>;
  misses: (MeasuredPage & { bucket: Exclude<Bucket, 'correct'> })[];
}

export type Measure = (pages: MeasuredPage[]) => Report;
export type RenderReport = (report: Report, provenance: string) => string;
