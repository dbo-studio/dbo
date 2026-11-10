import type { AiProviderType } from '@/types';

export type ModelCapabilities = {
  tools: boolean;
  contextWindow?: number;
};

type CapabilityRule = {
  pattern: RegExp;
  contextWindow?: number;
  tools: boolean;
};

// Best-effort table of well-known model families; unknown models get no badge.
const RULES: CapabilityRule[] = [
  { pattern: /^gpt-4\.1/, tools: true, contextWindow: 1_000_000 },
  { pattern: /^gpt-5/, tools: true, contextWindow: 400_000 },
  { pattern: /^gpt-4o/, tools: true, contextWindow: 128_000 },
  { pattern: /^gpt-4-turbo/, tools: true, contextWindow: 128_000 },
  { pattern: /^o[34]/, tools: true, contextWindow: 200_000 },
  { pattern: /^gpt-3\.5/, tools: true, contextWindow: 16_000 },
  { pattern: /^claude-/, tools: true, contextWindow: 200_000 },
  { pattern: /^gemini-(1\.5|2|3)/, tools: true, contextWindow: 1_000_000 },
  { pattern: /^(meta-llama\/)?llama-?3\.[1-9]/, tools: true, contextWindow: 128_000 },
  { pattern: /^(qwen|mistral|mixtral)/, tools: true, contextWindow: 32_000 }
];

export function getModelCapabilities(
  _providerType: AiProviderType['type'] | undefined,
  model: string | undefined
): ModelCapabilities {
  const name = (model ?? '').toLowerCase().trim();
  const rule = RULES.find((item) => item.pattern.test(name));
  return rule ? { tools: rule.tools, contextWindow: rule.contextWindow } : { tools: false };
}

export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M`;
  return `${Math.round(tokens / 1000)}K`;
}
