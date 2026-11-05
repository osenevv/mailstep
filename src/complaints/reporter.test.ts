import { expect, it } from 'vitest';
import { complaint, reporter } from './fixtures.ts';
import { isLargeClient, resolveReporter } from './reporter.ts';

it('I-large-client: a single matrix row makes the client large', () => {
  expect(isLargeClient('CL-LUMEN', [reporter()])).toBe(true);
  expect(isLargeClient('CL-BOR', [reporter()])).toBe(false);
});

it('I-last-reporter: a complaint without a reporter is skipped', () => {
  const resolved = resolveReporter('CL-BOR', 'Rychlopost', [], [
    complaint({
      id: 'C-empty',
      orderId: 'MS-2026-000801',
      reporter: null,
      createdAt: '2026-10-02T10:00:00+02:00',
    }),
    complaint({
      id: 'C-old',
      orderId: 'MS-2026-000802',
      reporter: 'Jana Bor',
      createdAt: '2026-09-01T10:00:00+02:00',
    }),
  ]);
  expect(resolved).toBe('Jana Bor');
});
