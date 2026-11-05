import { expect, it } from 'vitest';
import type { MeasuredPage } from './types.ts';
import { classify, measure } from './measure.ts';
import { confusionTotal, renderReport } from './render.ts';

function page(partial: Partial<MeasuredPage> & Pick<MeasuredPage, 'label' | 'reading'>): MeasuredPage {
  return {
    file: 'a.html',
    carrier: 'Rychlopost',
    split: 'dev',
    ...partial,
  };
}

it('classifies every bucket', () => {
  expect(classify('doručeno', 'doručeno')).toBe('correct');
  expect(classify('doručeno', 'v přepravě')).toBe('dangerous');
  expect(classify('vrací se', 'v přepravě')).toBe('dangerous');
  expect(classify('v přepravě', 'doručeno')).toBe('suppressing');
  expect(classify('v přepravě', 'vrací se')).toBe('suppressing');
  expect(classify('doručeno', 'nevím')).toBe('abstention');
  expect(classify('nevím', 'doručeno')).toBe('overconfident');
  expect(classify('doručeno', 'vrací se')).toBe('other_miss');
});

it('confusion totals equal the page count', () => {
  const report = measure([
    page({
      file: 'a.html',
      label: 'doručeno',
      reading: { status: 'v přepravě', carrier: 'Rychlopost', ruleId: 'r', evidence: 'x' },
    }),
    page({
      file: 'b.html',
      split: 'holdout',
      carrier: 'PaketNet',
      label: 'v přepravě',
      reading: { status: 'v přepravě', carrier: 'PaketNet', ruleId: 'r', evidence: 'y' },
    }),
  ]);
  expect(confusionTotal(report)).toBe(2);
  expect(report.total).toBe(2);
  expect(report.bySplit.dev.buckets.dangerous).toBe(1);
  expect(report.bySplit.holdout.agree).toBe(1);
  expect(report.misses.map((miss) => miss.file)).toEqual(['a.html']);
});

it('renders twice to the same bytes', () => {
  const report = measure([
    page({
      label: 'nevím',
      reading: {
        status: 'nevím',
        cause: 'empty',
        carrier: 'Rychlopost',
        ruleId: 'page.empty',
        evidence: null,
      },
    }),
  ]);
  const provenance = 'syntetický balíček';
  expect(renderReport(report, provenance)).toBe(renderReport(report, provenance));
});
