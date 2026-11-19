import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export function hasAi(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non impostata");
  // timeout breve: ogni chiamata gestisce una sola offerta (vincolo serverless)
  client ??= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return client;
}

/** Modelli che accettano il fallback lato server in caso di rifiuto (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-fable-5-2"]);

export class AiRefusalError extends Error {}

/**
 * Chiamata con output JSON strutturato e validato con zod.
 * Una sola richiesta, nessun loop: rispetta il limite di durata delle funzioni serverless.
 */
export async function structuredCall<T extends z.ZodType>(opts: {
  model: string;
  system: string;
  /** testo lungo e uguale tra le chiamate (es. il CV): va nel system prompt con la cache del prompt */
  cachedContext?: string;
  user: string;
  schema: T;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<T>> {
  const anthropic = getClient();
  const base = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.cachedContext
      ? [
          { type: "text" as const, text: opts.system },
          { type: "text" as const, text: opts.cachedContext, cache_control: { type: "ephemeral" as const } },
        ]
      : opts.system,
    messages: [{ role: "user" as const, content: opts.user }],
    output_config: {
      format: zodOutputFormat(opts.schema),
      // effort solo sui modelli che lo supportano (famiglia 5.x)
      ...(opts.effort && /claude-(haiku|sonnet|opus|fable)-5/.test(opts.model) ? { effort: opts.effort } : {}),
    },
  };

  const response = FALLBACK_MODELS.has(opts.model)
    ? await anthropic.beta.messages.parse({
        ...base,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      })
    : await anthropic.messages.parse(base);

  if (response.stop_reason === "refusal") throw new AiRefusalError("Il modello ha rifiutato la richiesta");
  if (response.stop_reason === "max_tokens") throw new Error("Risposta troncata (max_tokens)");
  const parsed = response.parsed_output;
  if (parsed == null) throw new Error("Risposta AI non valida");
  return opts.schema.parse(parsed);
}
