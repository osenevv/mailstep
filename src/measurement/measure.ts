import type { TrackingStatus } from '../tracking/types.ts';
import type { Bucket, MeasuredPage, Report, Split, Tally } from './types.ts';

export const STATUSES: TrackingStatus[] = ['doručeno', 'v přepravě', 'vrací se', 'nevím'];

const BUCKETS: Bucket[] = [
  'correct',
  'dangerous',
  'suppressing',
  'abstention',
  'overconfident',
  'other_miss',
];

export function measure(pages: MeasuredPage[]): Report {
  const confusion = emptyConfusion();
  const misses: Report['misses'] = [];
  for (const page of pages) {
    const predicted = page.reading.status;
    const row = confusion[page.label];
    row[predicted] += 1;
    const bucket = classify(page.label, predicted);
    if (bucket !== 'correct') misses.push({ ...page, bucket });
  }
  misses.sort((a, b) => severity(a.bucket) - severity(b.bucket) || a.file.localeCompare(b.file));

  const carriers = [...new Set(pages.map((page) => page.carrier))].sort((a, b) => a.localeCompare(b, 'cs'));
  const byCarrier: Record<string, Tally> = {};
  for (const carrier of carriers) {
    byCarrier[carrier] = tally(pages.filter((page) => page.carrier === carrier));
  }
  return {
    total: pages.length,
    bySplit: {
      dev: tally(pages.filter((page) => page.split === 'dev')),
      holdout: tally(pages.filter((page) => page.split === 'holdout')),
    },
    byCarrier,
    confusion,
    misses,
  };
}

export function classify(label: TrackingStatus, predicted: TrackingStatus): Bucket {
  if (label === predicted) return 'correct';
  if (predicted === 'v přepravě' && (label === 'doručeno' || label === 'vrací se')) return 'dangerous';
  if ((predicted === 'doručeno' || predicted === 'vrací se') && label === 'v přepravě') return 'suppressing';
  if (predicted === 'nevím' && label !== 'nevím') return 'abstention';
  if (predicted !== 'nevím' && label === 'nevím') return 'overconfident';
  return 'other_miss';
}

function tally(pages: MeasuredPage[]): Tally {
  const buckets = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<Bucket, number>;
  let agree = 0;
  for (const page of pages) {
    const bucket = classify(page.label, page.reading.status);
    buckets[bucket] += 1;
    if (bucket === 'correct') agree += 1;
  }
  return { pages: pages.length, agree, buckets };
}

function emptyConfusion(): Record<TrackingStatus, Record<TrackingStatus, number>> {
  return Object.fromEntries(
    STATUSES.map((label) => [label, Object.fromEntries(STATUSES.map((predicted) => [predicted, 0]))]),
  ) as Record<TrackingStatus, Record<TrackingStatus, number>>;
}

function severity(bucket: Exclude<Bucket, 'correct'>): number {
  return ['dangerous', 'suppressing', 'overconfident', 'other_miss', 'abstention'].indexOf(bucket);
}

export type { Split };
