import type { HTMLElement } from 'node-html-parser';
import type { TrackingReading } from '../types.ts';
import { unknown } from './common.ts';
import { readOldestFirst, rowsFrom } from './events.ts';

export function readPaketNet(root: HTMLElement): TrackingReading {
  const list = root.querySelector('ol.pn-timeline');
  if (!list) return unknown('unrecognized_template', 'paketnet', 'unrecognized-template', null);
  return readOldestFirst('paketnet', rowsFrom(list.querySelectorAll('li'), 'time', 'span.what'));
}
