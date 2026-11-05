import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import { parse as parseYaml } from 'yaml';
import { parseTimestamp } from '../complaints/window.ts';
import type { TrackingStatus } from '../tracking/types.ts';
import type {
  Complaint,
  Order,
  OrdersExport,
  Pack,
  ReporterRow,
  Rules,
  TrackingLabel,
  WmsReturn,
} from './types.ts';

const STATUSES = new Set<TrackingStatus>(['doručeno', 'v přepravě', 'vrací se', 'nevím']);

export function loadPack(dir: string): Pack {
  const ordersExport = readOrders(path.join(dir, 'orders.json'));
  const exportedAt = parseTimestamp(ordersExport.exportedAt);
  if (!exportedAt) fail('orders.json', null, 'exportedAt', 'ISO-8601 timestamp');
  const orders = ordersExport.orders.map((order, index) => checkOrder(order, index));
  const labelsFile = path.join(dir, 'tracking', 'labels.csv');
  return {
    exportedAt,
    orders,
    complaints: readComplaints(path.join(dir, 'complaints.json')),
    returns: readReturns(path.join(dir, 'returns.json')),
    reporters: readReporters(path.join(dir, 'reporters.csv')),
    rules: readRules(path.join(dir, 'rules.yaml')),
    trackingLabels: existsSync(labelsFile) ? readLabels(dir) : [],
    trackingHtml(trackingNumber: string) {
      const file = path.join(dir, 'tracking', `${trackingNumber}.html`);
      if (!existsSync(file)) return null;
      return readFileSync(file, 'utf8');
    },
  };
}

function readOrders(file: string): OrdersExport {
  const value = readJson(file);
  if (Array.isArray(value)) {
    return { exportedAt: new Date().toISOString(), orders: value as Order[] };
  }
  if (!isRecord(value) || !Array.isArray(value.orders) || typeof value.exportedAt !== 'string') {
    fail('orders.json', null, 'exportedAt', 'string and orders array (or bare orders array)');
  }
  return value as unknown as OrdersExport;
}

function checkOrder(value: unknown, index: number): Order {
  const order = value as Partial<Order>;
  stringField('orders.json', index, 'id', order.id);
  stringField('orders.json', index, 'clientId', order.clientId);
  stringField('orders.json', index, 'state', order.state);
  if (order.stateEnteredAt !== null && typeof order.stateEnteredAt !== 'string') {
    fail('orders.json', index, 'stateEnteredAt', 'string or null');
  }
  stringField('orders.json', index, 'shippingMethod', order.shippingMethod);
  stringField('orders.json', index, 'carrier', order.carrier);
  if (order.trackingNumber !== null && typeof order.trackingNumber !== 'string') {
    fail('orders.json', index, 'trackingNumber', 'string or null');
  }
  return order as Order;
}

function readComplaints(file: string): Complaint[] {
  const value = readJson(file);
  if (!Array.isArray(value)) fail('complaints.json', null, 'root', 'array');
  return value.map((item, index) => {
    const complaint = item as Partial<Complaint>;
    stringField('complaints.json', index, 'id', complaint.id);
    stringField('complaints.json', index, 'orderId', complaint.orderId);
    stringField('complaints.json', index, 'clientId', complaint.clientId);
    stringField('complaints.json', index, 'state', complaint.state);
    stringField('complaints.json', index, 'createdAt', complaint.createdAt);
    if (complaint.reporter !== null && typeof complaint.reporter !== 'string') {
      fail('complaints.json', index, 'reporter', 'string or null');
    }
    return complaint as Complaint;
  });
}

function readReturns(file: string): WmsReturn[] {
  const value = readJson(file);
  if (!Array.isArray(value)) fail('returns.json', null, 'root', 'array');
  return value.map((item, index) => {
    const row = item as Partial<WmsReturn>;
    stringField('returns.json', index, 'id', row.id);
    stringField('returns.json', index, 'orderId', row.orderId);
    stringField('returns.json', index, 'state', row.state);
    return row as WmsReturn;
  });
}

function readReporters(file: string): ReporterRow[] {
  const rows = parseCsv(readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  return rows.map((row, index) => {
    stringField('reporters.csv', index, 'clientId', row.clientId);
    stringField('reporters.csv', index, 'carrier', row.carrier);
    stringField('reporters.csv', index, 'reporter', row.reporter);
    return { clientId: row.clientId, carrier: row.carrier ?? '', reporter: row.reporter ?? '' };
  });
}

function readRules(file: string): Rules {
  const value = parseYaml(readFileSync(file, 'utf8')) as Partial<Rules>;
  for (const definition of ['A', 'B'] as const) {
    const rule = value.definitions?.[definition];
    if (!rule) fail('rules.yaml', null, `definitions.${definition}`, 'object');
    stringField('rules.yaml', null, `definitions.${definition}.orderState`, rule.orderState);
    if (typeof rule.minDays !== 'number') fail('rules.yaml', null, `definitions.${definition}.minDays`, 'number');
    if (!Array.isArray(rule.excludedMethods)) {
      fail('rules.yaml', null, `definitions.${definition}.excludedMethods`, 'string array');
    }
    stringField('rules.yaml', null, `definitions.${definition}.complaintReason`, rule.complaintReason);
  }
  return value as Rules;
}

function readLabels(dir: string): TrackingLabel[] {
  const file = path.join(dir, 'tracking', 'labels.csv');
  const rows = parseCsv(readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
  const labels = rows.map((row, index) => {
    stringField('labels.csv', index, 'file', row.file);
    stringField('labels.csv', index, 'carrier', row.carrier);
    if (!STATUSES.has(row.label as TrackingStatus)) fail('labels.csv', index, 'label', 'tracking status');
    return { file: row.file ?? '', carrier: row.carrier ?? '', label: row.label as TrackingStatus };
  });
  const html = new Set(
    readdirSync(path.join(dir, 'tracking')).filter((name) => name.endsWith('.html')),
  );
  const labelled = new Set(labels.map((label) => label.file));
  for (const name of html) {
    if (!labelled.has(name)) fail('labels.csv', null, name, 'a row for every html file');
  }
  for (const name of labelled) {
    if (!html.has(name)) fail('labels.csv', null, name, 'an html file for every row');
  }
  return labels;
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function stringField(file: string, index: number | null, field: string, value: unknown): asserts value is string {
  if (typeof value !== 'string') fail(file, index, field, 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fail(file: string, index: number | null, field: string, expected: string): never {
  const where = index === null ? file : `${file}[${index}]`;
  throw new Error(`${where}.${field}: expected ${expected}`);
}
