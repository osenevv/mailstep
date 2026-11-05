import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { decide } from './complaints/decide.ts';
import { gate } from './complaints/gate.ts';
import type { FinalDecision } from './complaints/types.ts';
import { parseTimestamp } from './complaints/window.ts';
import { measure } from './measurement/measure.ts';
import { renderReport } from './measurement/render.ts';
import type { Split } from './measurement/types.ts';
import { loadPack } from './pack/load.ts';
import type { Order } from './pack/types.ts';
import { readTracking } from './tracking/read.ts';
import type { TrackingReading } from './tracking/types.ts';

const PROVENANCE = [
  'Balíček je syntetický. Skutečné podklady k zadání nebyly dodány.',
  'Stránky i čtečka vznikly podle jedné šablony na dopravce. Holdout je druhá půlka souborů. Pravidla se na něj nedolaďovala, ale není to zkouška na cizích stránkách dopravců.',
  'Šablona v2 je v obou půlkách schválně neznámá: čtečka řekne nevím a reklamace se nezaloží.',
  'Příkaz: npm start',
].join('\n');

const usage = `Usage:
  tsx src/cli.ts decide  [--data dir] [--as-of iso]
  tsx src/cli.ts measure [--data dir] [--check]
  tsx src/cli.ts all     [--data dir] [--as-of iso]`;

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command === 'decide') {
    decideCommand(parsed.data, parsed.asOf);
    return;
  }
  if (parsed.command === 'measure') {
    const changed = measureCommand(parsed.data, parsed.check);
    if (parsed.check && changed) process.exit(1);
    return;
  }
  decideCommand(parsed.data, parsed.asOf);
  measureCommand(parsed.data, false);
}

function decideCommand(dir: string, asOfFlag: string | null): void {
  const pack = loadOrExit(dir);
  const asOf = asOfFlag ? parseTimestamp(asOfFlag) : pack.exportedAt;
  if (!asOf) {
    console.error(`--as-of: expected ISO-8601 timestamp`);
    process.exit(2);
  }
  const rows = pack.orders.map((order) => {
    const rules = decide(order, {
      asOf,
      rules: pack.rules,
      complaints: pack.complaints,
      returns: pack.returns,
      reporters: pack.reporters,
    });
    const tracking = rules.kind === 'eligible' ? readingFor(pack.trackingHtml, order) : null;
    const finalDecision = gate(rules, tracking);
    return toRow(order, finalDecision);
  });
  mkdirSync('out', { recursive: true });
  writeFileSync('out/decisions.json', `${JSON.stringify(rows, null, 2)}\n`);
  printTable(rows);
  const counts = countActions(rows);
  console.log(`FILE ${counts.FILE}  NEEDS_HUMAN ${counts.NEEDS_HUMAN}  DO_NOT_FILE ${counts.DO_NOT_FILE}`);
}

function measureCommand(dir: string, check: boolean): boolean {
  const pack = loadOrExit(dir);
  const splits = readSplits(path.join(dir, 'tracking', 'split.md'));
  const pages = pack.trackingLabels.map((label) => {
    const html = readFileSync(path.join(dir, 'tracking', label.file), 'utf8');
    const split = splits.get(label.file);
    if (!split) {
      console.error(`tracking/split.md.${label.file}: expected dev or holdout`);
      process.exit(2);
    }
    return {
      file: label.file,
      carrier: label.carrier,
      split,
      label: label.label,
      reading: readTracking(html),
    };
  });
  const report = measure(pages);
  const markdown = renderReport(report, PROVENANCE);
  mkdirSync('docs', { recursive: true });
  const target = path.join('docs', 'mereni.md');
  const previous = exists(target) ? readFileSync(target, 'utf8') : '';
  if (!check) writeFileSync(target, markdown);
  const dev = report.bySplit.dev;
  const holdout = report.bySplit.holdout;
  console.log(
    `pages ${pages.length}  dev ${percent(dev.agree, dev.pages)}  holdout ${percent(holdout.agree, holdout.pages)}  dangerous ${dev.buckets.dangerous + holdout.buckets.dangerous}  suppressing ${dev.buckets.suppressing + holdout.buckets.suppressing}  abstention ${dev.buckets.abstention + holdout.buckets.abstention}`,
  );
  return markdown !== previous;
}

function readingFor(trackingHtml: (trackingNumber: string) => string | null, order: Order): TrackingReading | null {
  if (!order.trackingNumber) return null;
  const html = trackingHtml(order.trackingNumber);
  if (html === null) return null;
  return readTracking(html);
}

interface Row {
  orderId: string;
  clientId: string;
  definition: string;
  action: FinalDecision['action'];
  code: string;
  codes: string;
  reporter: string | null;
  detail: string | null;
  complaintReason: string | null;
}

function toRow(order: Order, decision: FinalDecision): Row {
  const rules = decision.rules;
  const codes = rules.kind === 'blocked' ? rules.blocks.join(',') : decision.code;
  return {
    orderId: order.id,
    clientId: order.clientId,
    definition: rules.kind === 'not_candidate' ? '-' : rules.definition,
    action: decision.action,
    code: decision.code,
    codes,
    reporter: rules.kind === 'eligible' ? rules.reporter : null,
    detail: rules.kind === 'eligible' ? null : rules.detail,
    complaintReason: rules.kind === 'eligible' ? rules.complaintReason : null,
  };
}

function printTable(rows: Row[]): void {
  const header = ['order', 'client', 'def', 'action', 'code', 'reporter', 'detail'];
  const body = rows.map((row) => [
    row.orderId,
    row.clientId,
    row.definition,
    row.action,
    row.codes,
    row.reporter ?? '',
    row.detail ?? '',
  ]);
  const widths = header.map((cell, index) =>
    Math.max(cell.length, ...body.map((line) => line[index]?.length ?? 0)),
  );
  const format = (cells: string[]) => cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join('  ');
  console.log(format(header));
  for (const line of body) console.log(format(line));
}

function countActions(rows: Row[]): Record<Row['action'], number> {
  return {
    FILE: rows.filter((row) => row.action === 'FILE').length,
    NEEDS_HUMAN: rows.filter((row) => row.action === 'NEEDS_HUMAN').length,
    DO_NOT_FILE: rows.filter((row) => row.action === 'DO_NOT_FILE').length,
  };
}

function readSplits(file: string): Map<string, Split> {
  const map = new Map<string, Split>();
  let split: Split | null = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('## dev')) split = 'dev';
    else if (line.startsWith('## holdout')) split = 'holdout';
    else if (line.startsWith('- ') && split) map.set(line.slice(2).trim(), split);
  }
  return map;
}

function percent(agree: number, pages: number): string {
  if (pages === 0) return '0.0%';
  return `${((agree / pages) * 100).toFixed(1)}%`;
}

function exists(file: string): boolean {
  try {
    readFileSync(file);
    return true;
  } catch {
    return false;
  }
}

interface Args {
  command: 'decide' | 'measure' | 'all';
  data: string;
  asOf: string | null;
  check: boolean;
}

function parseArgs(argv: string[]): Args {
  const command = argv[0];
  if (command !== 'decide' && command !== 'measure' && command !== 'all') {
    console.error(usage);
    process.exit(64);
  }
  let data = 'data';
  let asOf: string | null = null;
  let check = false;
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--data') {
      data = requireValue(argv, i);
      i += 1;
    } else if (token === '--as-of') {
      asOf = requireValue(argv, i);
      i += 1;
    } else if (token === '--check') {
      check = true;
    } else {
      console.error(usage);
      process.exit(64);
    }
  }
  return { command, data, asOf, check };
}

function requireValue(argv: string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(usage);
    process.exit(64);
  }
  return value;
}

function loadOrExit(dir: string): ReturnType<typeof loadPack> {
  try {
    return loadPack(dir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

main();
