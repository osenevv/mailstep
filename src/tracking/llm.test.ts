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

  it('calculates cost per evaluation across providers under 0.05 CZK', () => {
    const textLength = 1200; // typical clean tracking page text length
    const flashCost = estimateEvaluationCost(textLength, 'flash');
    expect(flashCost.costCzk).toBeLessThan(0.02); // ~0.008 CZK per page
    expect(flashCost.model).toBe(MODELS.flash.name);

    const haikuCost = estimateEvaluationCost(textLength, 'haiku');
    expect(haikuCost.costCzk).toBeLessThan(0.05); // ~0.028 CZK per page
  });
});
