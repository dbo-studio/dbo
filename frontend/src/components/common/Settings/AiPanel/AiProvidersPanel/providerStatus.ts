import { isProviderReady } from '@/core/ai/aiStatus';
import locales from '@/locales';
import type { AiProviderType } from '@/types';

export function providerStatus(provider: AiProviderType): { label: string; tone: 'success' | 'warning' | 'neutral' } {
  if (provider.isActive && isProviderReady(provider)) {
    return { label: locales.ai_provider_in_use, tone: 'success' };
  }

  if (isProviderReady(provider)) {
    return { label: locales.ai_status_ready, tone: 'neutral' };
  }

  return { label: locales.ai_provider_needs_key, tone: 'warning' };
}
