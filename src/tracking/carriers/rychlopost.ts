import type { HTMLElement } from 'node-html-parser';
import type { TrackingReading } from '../types.ts';
import { unknown } from './common.ts';
import { readNewestFirst, rowsFrom } from './events.ts';

export function readRychlopost(root: HTMLElement): TrackingReading {
  const table = root.querySelector('table.rp-events');
  if (!table) return unknown('unrecognized_template', 'rychlopost', 'unrecognized-template', null);
  const body = table.querySelector('tbody') ?? table;
  return readNewestFirst('rychlopost', rowsFrom(body.querySelectorAll('tr'), 'td.when', 'td.what'));
}
