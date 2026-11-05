import { parse } from 'node-html-parser';
import { readNordParcel } from './carriers/nordparcel.ts';
import { readPaketNet } from './carriers/paketnet.ts';
import { readRychlopost } from './carriers/rychlopost.ts';
import { readVeloCorriere } from './carriers/velocorriere.ts';
import { CARRIER_NAME, unknown, type CarrierSlug } from './carriers/common.ts';
import type { TrackingReading } from './types.ts';

export function readTracking(html: string): TrackingReading {
  if (html.trim() === '') return unknown('empty', null, 'page.empty', null);
  const root = parse(html);
  const bodyText = root.querySelector('body')?.text.trim() ?? root.text.trim();
  if (bodyText === '') return unknown('empty', null, 'page.empty', null);
  if (root.querySelector('#carrier-error')) {
    const slug = slugOf(root.querySelector('[data-carrier]')?.getAttribute('data-carrier'));
    return unknown('error_page', slug, slug ? 'error-page' : 'page.error', root.querySelector('#carrier-error')?.text.trim() ?? null);
  }
  const marker = root.querySelector('[data-carrier]')?.getAttribute('data-carrier') ?? null;
  const slug = slugOf(marker);
  if (!slug) return unknown('unknown_carrier', null, 'page.unknown-carrier', marker);
  switch (slug) {
    case 'rychlopost':
      return readRychlopost(root);
    case 'paketnet':
      return readPaketNet(root);
    case 'velocorriere':
      return readVeloCorriere(root);
    case 'nordparcel':
      return readNordParcel(root);
  }
}

function slugOf(value: string | null | undefined): CarrierSlug | null {
  if (!value) return null;
  return value in CARRIER_NAME ? (value as CarrierSlug) : null;
}
