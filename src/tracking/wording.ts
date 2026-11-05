import type { TrackingStatus } from './types.ts';

const RETURN = [
  'vrací se odesílateli',
  'se vrací odesílateli',
  'vrací se',
  'se vrací',
  'returning to sender',
  'in restituzione al mittente',
  'in restituzione',
];

const FAILED = ['nedoručeno', 'doručení se nezdařilo', 'non consegnato', 'not delivered'];

const DEPOT = ['doručeno na depo', 'delivered to depot', 'consegnato al deposito'];

const DELIVERED = ['doručeno příjemci', 'doručeno', 'consegnato', 'delivered'];

const TRANSIT = [
  'v přepravě',
  'předáno dopravci',
  'in transito',
  'consegna in corso',
  'in consegna',
  'in transit',
  'picked up',
  'přijato',
];

export function mapWording(text: string): TrackingStatus | null {
  // Normalize whitespace (including &nbsp; \u00a0 and multi-spaces)
  const value = text.replace(/\s+/gu, ' ').trim().toLocaleLowerCase('cs');
  if (containsAny(value, RETURN)) return 'vrací se';
  if (containsAny(value, FAILED)) return 'v přepravě';
  if (containsAny(value, DEPOT)) return 'v přepravě';
  if (containsAny(value, DELIVERED)) return 'doručeno';
  if (containsAny(value, TRANSIT)) return 'v přepravě';
  return null;
}

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

function hasPhrase(text: string, phrase: string): boolean {
  const pattern = phrase
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, 'iu').test(text);
}
