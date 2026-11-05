import { parse, type HTMLElement } from 'node-html-parser';
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
    const slug = detectCarrier(root);
    return unknown('error_page', slug, slug ? 'error-page' : 'page.error', root.querySelector('#carrier-error')?.text.trim() ?? null);
  }
  const slug = detectCarrier(root);
  if (!slug) {
    const rawMarker = root.querySelector('[data-carrier]')?.getAttribute('data-carrier') ?? null;
    return unknown('unknown_carrier', null, 'page.unknown-carrier', rawMarker);
  }
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

function detectCarrier(root: HTMLElement): CarrierSlug | null {
  const marker = root.querySelector('[data-carrier]')?.getAttribute('data-carrier');
  const fromMarker = slugOf(marker);
  if (fromMarker) return fromMarker;

  if (root.querySelector('table.rp-events')) return 'rychlopost';
  if (root.querySelector('ol.pn-timeline')) return 'paketnet';
  if (root.querySelector('ul.vc-events')) return 'velocorriere';
  if (root.querySelector('p.np-badge, ul.np-history')) return 'nordparcel';

  const title = (root.querySelector('title')?.text ?? '').toLowerCase();
  if (title.includes('rychlopost')) return 'rychlopost';
  if (title.includes('paketnet')) return 'paketnet';
  if (title.includes('velocorriere')) return 'velocorriere';
  if (title.includes('nordparcel')) return 'nordparcel';

  return null;
}

function slugOf(value: string | null | undefined): CarrierSlug | null {
  if (!value) return null;
  return value in CARRIER_NAME ? (value as CarrierSlug) : null;
}
