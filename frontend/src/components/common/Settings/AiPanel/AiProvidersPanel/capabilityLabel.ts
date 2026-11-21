import { formatContextWindow, getModelCapabilities } from '@/core/ai/modelCapabilities';
import locales from '@/locales';
import type { AiProviderType } from '@/types';

export function capabilityLabel(providerType: AiProviderType['type'], model: string): string | null {
  const caps = getModelCapabilities(providerType, model);
  if (!caps.tools) return null;
  return caps.contextWindow
    ? `${locales.ai_tools_supported} · ${formatContextWindow(caps.contextWindow)}`
    : locales.ai_tools_supported;
}