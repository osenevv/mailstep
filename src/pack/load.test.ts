import { describe, expect, it } from 'vitest';
import { loadPack } from './load.ts';

describe('loadPack', () => {
  it('loads standard data pack', () => {
    const pack = loadPack('data');
    expect(pack.orders.length).toBeGreaterThan(0);
    expect(pack.trackingLabels.length).toBeGreaterThan(0);
    expect(pack.rules.definitions.A).toBeDefined();
    expect(pack.rules.definitions.B).toBeDefined();
  });
});
