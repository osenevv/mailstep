import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadPack } from './load.ts';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('loadPack', () => {
  it('loads standard data pack', () => {
    const pack = loadPack('data');
    expect(pack.orders.length).toBeGreaterThan(0);
    expect(pack.trackingLabels.length).toBeGreaterThan(0);
    expect(pack.rules.definitions.A).toBeDefined();
    expect(pack.rules.definitions.B).toBeDefined();
  });

  it('rejects a bare orders array without exportedAt', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mailstep-pack-'));
    tempDirs.push(dir);
    writeMinimalPack(dir, JSON.stringify([{ id: 'MS-1' }]));
    expect(() => loadPack(dir)).toThrow(/exportedAt/);
  });

  it('handles CRLF line endings and quoted cells in reporters.csv', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mailstep-pack-'));
    tempDirs.push(dir);
    writeMinimalPack(
      dir,
      JSON.stringify({ exportedAt: '2026-11-03T06:00:00+01:00', orders: [] }),
    );
    // Write CRLF and quotes in reporters.csv
    writeFileSync(
      path.join(dir, 'reporters.csv'),
      'clientId,carrier,reporter\r\n"CL-LUMEN","Rychlopost Standard, Express","Eva Králová"\r\n\r\n"CL-NIVA","*","Martin Holub"\r\n',
    );
    const pack = loadPack(dir);
    expect(pack.reporters).toHaveLength(2);
    expect(pack.reporters[0]?.carrier).toBe('Rychlopost Standard, Express');
    expect(pack.reporters[1]?.reporter).toBe('Martin Holub');
  });

  it('rejects invalid JSON syntax in orders.json', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mailstep-pack-'));
    tempDirs.push(dir);
    writeMinimalPack(dir, '{"exportedAt": "2026-11-03T06:00:00+01:00", "orders": [broken json}');
    expect(() => loadPack(dir)).toThrow();
  });

  it('rejects invalid types inside orders array', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mailstep-pack-'));
    tempDirs.push(dir);
    writeMinimalPack(
      dir,
      JSON.stringify({
        exportedAt: '2026-11-03T06:00:00+01:00',
        orders: [
          {
            id: 12345, // invalid: number instead of string
            clientId: 'CL-TEST',
            state: 'čeká na dopravce',
            stateEnteredAt: '2026-11-01T06:00:00+01:00',
            shippingMethod: 'Standard',
            carrier: 'Rychlopost',
            trackingNumber: null,
          },
        ],
      }),
    );
    expect(() => loadPack(dir)).toThrow(/string/);
  });

  it('returns null when trackingHtml is queried for a non-existent file', () => {
    const pack = loadPack('data');
    expect(pack.trackingHtml('NON-EXISTENT-TRACKING-ID')).toBeNull();
  });
});

function writeMinimalPack(dir: string, ordersJson: string): void {
  mkdirSync(path.join(dir, 'tracking'), { recursive: true });
  writeFileSync(path.join(dir, 'orders.json'), ordersJson);
  writeFileSync(path.join(dir, 'complaints.json'), '[]');
  writeFileSync(path.join(dir, 'returns.json'), '[]');
  writeFileSync(path.join(dir, 'reporters.csv'), 'clientId,carrier,reporter\n');
  writeFileSync(
    path.join(dir, 'rules.yaml'),
    `definitions:
  A:
    orderState: čeká na dopravce
    minDays: 2
    excludedMethods: []
    complaintReason: nevyzvednuto dopravcem
  B:
    orderState: převzato dopravcem
    minDays: 14
    excludedMethods: []
    complaintReason: ztráta
`,
  );
}
