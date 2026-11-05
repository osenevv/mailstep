const WITH_OFFSET =
  /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2})$/;
const ZONELESS =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseTimestamp(value: string): Date | null {
  if (WITH_OFFSET.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = ZONELESS.exec(value);
  if (!match) return null;
  return pragueCivilToUtc({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    ms: Number((match[7] ?? '0').padEnd(3, '0')),
  });
}

export function elapsedMs(asOf: Date, enteredAt: Date): number {
  return asOf.getTime() - enteredAt.getTime();
}

export function windowReached(elapsed: number, minDays: number): boolean {
  return elapsed >= minDays * DAY_MS;
}

export function formatElapsed(elapsed: number): string {
  const sign = elapsed < 0 ? '−' : '';
  const totalMin = Math.floor(Math.abs(elapsed) / 60000);
  const days = Math.floor(totalMin / (24 * 60));
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const minutes = totalMin % 60;
  return `${sign}${days} d ${hours} h ${minutes} min`;
}

interface Civil {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}

function pragueCivilToUtc(civil: Civil): Date | null {
  const asCet = civilToUtc(civil, 1);
  const asCest = civilToUtc(civil, 2);
  const cetOk = sameCivil(asCet, civil);
  const cestOk = sameCivil(asCest, civil);
  if (cetOk && cestOk) return asCet;
  if (cetOk) return asCet;
  if (cestOk) return asCest;
  return null;
}

function civilToUtc(civil: Civil, offsetHours: number): Date {
  return new Date(
    Date.UTC(
      civil.year,
      civil.month - 1,
      civil.day,
      civil.hour - offsetHours,
      civil.minute,
      civil.second,
      civil.ms,
    ),
  );
}

function sameCivil(date: Date, civil: Civil): boolean {
  const parts = pragueParts(date);
  return (
    parts.year === civil.year &&
    parts.month === civil.month &&
    parts.day === civil.day &&
    parts.hour === civil.hour &&
    parts.minute === civil.minute &&
    parts.second === civil.second
  );
}

function pragueParts(date: Date): Omit<Civil, 'ms'> {
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Prague',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}
