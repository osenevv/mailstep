import type { HTMLElement } from 'node-html-parser';
import { mapWording } from '../wording.ts';
import type { TrackingReading } from '../types.ts';
import { known, unknown, type CarrierSlug } from './common.ts';

export interface EventRow {
  when: string;
  what: string;
}

export function readNewestFirst(slug: CarrierSlug, rows: EventRow[]): TrackingReading {
  if (rows.length === 0) return unknown('no_carrier_events', slug, 'no-events', null);
  const newestWhen = rows[0]?.when ?? '';
  const sameTime = rows.filter((row) => row.when === newestWhen);
  return fromRows(slug, sameTime, 'latest-event');
}

export function readOldestFirst(slug: CarrierSlug, rows: EventRow[]): TrackingReading {
  if (rows.length === 0) return unknown('no_carrier_events', slug, 'no-events', null);
  const newestWhen = rows[rows.length - 1]?.when ?? '';
  const sameTime = rows.filter((row) => row.when === newestWhen);
  return fromRows(slug, sameTime, 'latest-event');
}

function fromRows(slug: CarrierSlug, rows: EventRow[], rulePrefix: string): TrackingReading {
  const mapped = rows.map((row) => ({ row, status: mapWording(row.what) }));
  if (mapped.some((item) => item.status === null)) {
    // ponytail: unknown wording reuses unrecognized_template, add a cause when UnknownCause can grow
    return unknown('unrecognized_template', slug, 'wording.unknown', rows.map((row) => row.what).join(' | '));
  }
  const statuses = new Set(mapped.map((item) => item.status));
  if (statuses.size > 1) {
    return unknown('conflicting_events', slug, 'conflicting-events', rows.map((row) => row.what).join(' | '));
  }
  const status = mapped[0]?.status;
  const evidence = mapped[0]?.row.what ?? '';
  if (status !== 'doručeno' && status !== 'v přepravě' && status !== 'vrací se') {
    return unknown('unrecognized_template', slug, 'wording.unknown', evidence);
  }
  return known(status, slug, `${rulePrefix}.${ruleSuffix(status)}`, evidence);
}

export function rowsFrom(items: HTMLElement[], whenSel: string, whatSel: string): EventRow[] {
  return items
    .map((item) => ({
      when: item.querySelector(whenSel)?.text.trim() ?? '',
      what: item.querySelector(whatSel)?.text.trim() ?? '',
    }))
    .filter((row) => row.when !== '' || row.what !== '');
}

function ruleSuffix(status: 'doručeno' | 'v přepravě' | 'vrací se'): string {
  if (status === 'doručeno') return 'delivered';
  if (status === 'vrací se') return 'returning';
  return 'in-transit';
}
