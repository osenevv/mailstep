import { describe, expect, it } from 'vitest';
import { estimateEvaluationCost, extractTextForLlm, MODELS } from './llm.ts';

describe('LLM Fallback & Cost Estimation', () => {
  it('cleans HTML text before sending to LLM', () => {
    const rawHtml = `
      <html>
        <head><script>alert(1)</script><style>.a{color:red}</style></head>
        <body>
          <nav>Menu link</nav>
          <div class="content">Balíček byl doručen příjemci dne 03.11.2026.</div>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;
    const cleaned = extractTextForLlm(rawHtml);
    expect(cleaned).not.toContain('alert(1)');
    expect(cleaned).not.toContain('color:red');
    expect(cleaned).not.toContain('Copyright 2026');
    expect(cleaned).toContain('Balíček byl doručen příjemci');
  });

  it('keeps a typical page under 0.02 Kč on every listed tier', () => {
    const textLength = 1200;
    for (const key of Object.keys(MODELS) as Array<keyof typeof MODELS>) {
      const cost = estimateEvaluationCost(textLength, key);
      expect(cost.model).toBe(MODELS[key].name);
      expect(cost.costCzk).toBeLessThan(0.02);
    }
    expect(estimateEvaluationCost(textLength, 'haiku').costCzk).toBeCloseTo(0.0018, 3);
    expect(estimateEvaluationCost(textLength, 'flash').costCzk).toBeCloseTo(0.0065, 3);
    expect(estimateEvaluationCost(textLength, 'nano').costCzk).toBeCloseTo(0.0011, 3);
  });
});
