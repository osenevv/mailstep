import type { HTMLElement } from 'node-html-parser';
import { mapWording } from '../wording.ts';
import type { TrackingReading } from '../types.ts';
import { known, unknown } from './common.ts';

export function readNordParcel(root: HTMLElement): TrackingReading {
  const badge = root.querySelector('p.np-badge');
  if (!badge) return unknown('unrecognized_template', 'nordparcel', 'unrecognized-template', null);
  const badgeText = badge.text.trim();
  if (badgeText === '') return unknown('no_carrier_events', 'nordparcel', 'no-events', null);
  const badgeStatus = mapWording(badgeText);
  if (!badgeStatus) return unknown('unrecognized_template', 'nordparcel', 'wording.unknown', badgeText);
  const history = root.querySelector('ul.np-history li span.what')?.text.trim() ?? '';
  if (history !== '') {
    const historyStatus = mapWording(history);
    if (historyStatus && historyStatus !== badgeStatus) {
      return unknown('conflicting_events', 'nordparcel', 'conflicting-events', `${badgeText} | ${history}`);
    }
  }
  const suffix = badgeStatus === 'doručeno' ? 'delivered' : badgeStatus === 'vrací se' ? 'returning' : 'in-transit';
  return known(badgeStatus, 'nordparcel', `badge.${suffix}`, badgeText);
}
