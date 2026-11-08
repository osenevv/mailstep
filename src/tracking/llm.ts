/**
 * LLM fallback cost model for untemplated tracking pages.
 * Answers the brief: which model, and how much one evaluation costs.
 * Not wired into readTracking — deterministic parsers stay on the hot path.
 *
 * Rates: provider list prices as of 2026-11-07 (USD per 1M tokens).
 */

export interface ModelPricing {
  name: string;
  provider: string;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  czkRate: number;
}

/** Cheap classification tiers — prompts here are well under 100k tokens. */
export const MODELS: Record<'flash' | 'haiku' | 'nano', ModelPricing> = {
  flash: {
    name: 'Gemini 3.5 Flash-Lite',
    provider: 'Google',
    inputPerMillionUsd: 0.3,
    outputPerMillionUsd: 2.5,
    czkRate: 23.5,
  },
  haiku: {
    name: 'Claude Haiku 5.5',
    provider: 'Anthropic',
    inputPerMillionUsd: 0.1,
    outputPerMillionUsd: 0.5,
    czkRate: 23.5,
  },
  nano: {
    name: 'GPT-5 nano',
    provider: 'OpenAI',
    inputPerMillionUsd: 0.05,
    outputPerMillionUsd: 0.4,
    czkRate: 23.5,
  },
};

export interface CostEstimate {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  costCzk: number;
}

/**
 * Strips script tags, style sheets, and HTML noise, keeping only legible text and events
 */
export function extractTextForLlm(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 3000); // Token cap
}

/**
 * Calculates per-evaluation price based on average token usage
 */
export function estimateEvaluationCost(
  cleanTextLength: number,
  modelKey: keyof typeof MODELS = 'haiku',
): CostEstimate {
  const model = MODELS[modelKey];
  // 1 token ≈ 4 characters in multilingual text
  const textTokens = Math.ceil(cleanTextLength / 4);
  const systemPromptTokens = 250;
  const promptTokens = textTokens + systemPromptTokens;
  const completionTokens = 45; // JSON response { status, evidence, confidence }

  const costUsd =
    (promptTokens / 1_000_000) * model.inputPerMillionUsd +
    (completionTokens / 1_000_000) * model.outputPerMillionUsd;
  const costCzk = costUsd * model.czkRate;

  return {
    model: model.name,
    provider: model.provider,
    promptTokens,
    completionTokens,
    costUsd: Number(costUsd.toFixed(6)),
    costCzk: Number(costCzk.toFixed(4)),
  };
}

/**
 * The production system prompt template for the LLM fallback
 */
export const LLM_PROMPT_SPEC = `
Jsi klasifikátor stavu doručení v fulfillmentovém systému Mailstep.
Tvým úkolem je určit stav zásilky z textu stránky dopravce:
- "doručeno" (zásilka byla úspěšně předána příjemci)
- "v přepravě" (zásilka cestuje, je na depu, nebo probíhá další pokus o doručení)
- "vrací se" (zásilka směřuje zpět odesílateli)
- "nevím" (stránka je nečitelná, obsahuje chybu, nebo stav nelze jednoznačně určit)

Bezpečnostní pravidlo (Cena chyby):
Pokud text obsahuje "nedoručeno" nebo "neúspěšný pokus", klasifikuj jako "v přepravě", NIKOLIV "doručeno".
Pokud je confidence < 0.85, odpověz "nevím". Falešné "v přepravě" u ztráty založí neoprávněnou reklamaci.

Vrať JSON:
{
  "status": "doručeno" | "v přepravě" | "vrací se" | "nevím",
  "evidence": "přesná citace klíčové věty (max 100 znaků)",
  "confidence": číslo 0.0 až 1.0
}
`.trim();
