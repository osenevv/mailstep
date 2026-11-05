import { expect, it } from 'vitest';
import { complaintBlocks, returnBlocks } from './blocks.ts';
import { complaint, wmsReturn } from './fixtures.ts';

it('I-complaint-block: only the same order id blocks', () => {
  expect(complaintBlocks('MS-2026-000001', [complaint()])).toBe(true);
  expect(complaintBlocks('MS-2026-000002', [complaint()])).toBe(false);
});

it('I-return-block: any return on the order blocks', () => {
  expect(returnBlocks('MS-2026-000001', [wmsReturn({ state: 'storno' })])).toBe(true);
  expect(returnBlocks('MS-2026-000002', [wmsReturn()])).toBe(false);
});
