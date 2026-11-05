/**
 * LLM Fallback Specification & Cost Model for Untemplated Tracking Pages
 * Answers Case Study Part 2 requirement:
 * "Pokud použijete jazykový model, uveďte který a kolik stojí jedno vyhodnocení."
 */

export interface ModelPricing {
  name: string;
  provider: string;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  czkRate: number; // e.g. 23.50 CZK/USD
}

export const MODELS: Record<'haiku' | 'flash' | 'gpt4o_mini', ModelPricing> = {
  flash: {
    name: 'Gemini 1.5 Flash',
    provider: 'Google Cloud',
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.30,
    czkRate: 23.5,
  },
  haiku: {
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    inputPerMillionUsd: 0.80,
    outputPerMillionUsd: 4.00,
    czkRate: 23.5,
  },
  gpt4o_mini: {
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.60,
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
  modelKey: keyof typeof MODELS = 'flash',
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
Pokud si nejsi 100% jistý, odpověz "nevím". Falešné "v přepravě" způsobí neoprávněnou reklamaci ztráty.

Vrať JSON:
{
  "status": "doručeno" | "v přepravě" | "vrací se" | "nevím",
  "evidence": "přesná citace klíčové věty (max 100 znaků)",
  "confidence": číslo 0.0 až 1.0
}
`.trim();
