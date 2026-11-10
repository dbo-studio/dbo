import { getModelCapabilities } from '@/core/ai/modelCapabilities';
import type { AiContextType, AiProviderType } from '@/types';

const CHARS_PER_TOKEN = 4;
const TOKENS_PER_OBJECT = 40;
const DEFAULT_CONTEXT_WINDOW = 32_000;

/** Soft estimate of what the next message carries; the backend adds the real schema text. */
export function estimateContextTokens(context: AiContextType): number {
  const text = [
    context.input,
    context.querySnippet,
    context.selectedQuery,
    context.queryResultSummary,
    context.objectDefinition
  ].reduce((total, part) => total + (part?.length ?? 0), 0);

  const objects = context.tables.length + context.views.length + (context.database ? 1 : 0) + (context.schema ? 1 : 0);

  return Math.ceil(text / CHARS_PER_TOKEN) + objects * TOKENS_PER_OBJECT;
}

export function contextWindowOf(provider: AiProviderType | undefined): number {
  return getModelCapabilities(provider?.type, provider?.model).contextWindow ?? DEFAULT_CONTEXT_WINDOW;
}

export function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${Math.round(tokens / 100) / 10}K` : String(tokens);
}
