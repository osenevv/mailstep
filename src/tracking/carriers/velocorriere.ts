import type { HTMLElement } from 'node-html-parser';
import type { TrackingReading } from '../types.ts';
import { unknown } from './common.ts';
import { readNewestFirst, rowsFrom } from './events.ts';

export function readVeloCorriere(root: HTMLElement): TrackingReading {
  const list = root.querySelector('ul.vc-events');
  if (!list) return unknown('unrecognized_template', 'velocorriere', 'unrecognized-template', null);
  return readNewestFirst('velocorriere', rowsFrom(list.querySelectorAll('li'), 'span.when', 'span.what'));
}
