import type { AiProviderType } from '@/types';

export type AiStatusReason = 'missing_key' | 'missing_url' | 'missing_model' | 'none';
export type AiStatusState = 'unconfigured' | 'incomplete' | 'ready';

export type AiStatus = {
  state: AiStatusState;
  reason: AiStatusReason;
  ready: boolean;
  provider?: AiProviderType;
};

function hasApiKey(provider: AiProviderType): boolean {
  return Boolean(provider.apiKey && provider.apiKey.length > 0);
}

function providerGap(provider: AiProviderType): AiStatusReason {
  if (!provider.url) {
    return 'missing_url';
  }

  if (!provider.model) {
    return 'missing_model';
  }

  if (provider.type !== 'ollama' && !hasApiKey(provider)) {
    return 'missing_key';
  }

  return 'none';
}

export function isProviderReady(provider: AiProviderType): boolean {
  return providerGap(provider) === 'none';
}

export function getAiStatus(providers: AiProviderType[] | undefined): AiStatus {
  const provider = providers?.find((item) => item.isActive);
  if (!provider) {
    return { state: 'unconfigured', reason: 'none', ready: false };
  }

  const reason = providerGap(provider);
  if (reason === 'none') {
    return { state: 'ready', reason, ready: true, provider };
  }

  return { state: 'incomplete', reason, ready: false, provider };
}
