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
