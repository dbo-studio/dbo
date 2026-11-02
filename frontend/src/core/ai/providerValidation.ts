import locales from '@/locales';
import type { AiProviderType } from '@/types';

export type ProviderDraft = Pick<AiProviderType, 'type' | 'url' | 'apiKey' | 'timeout' | 'model'>;
export type ProviderErrors = Partial<Record<'url' | 'apiKey' | 'timeout' | 'model', string>>;

const MAX_TIMEOUT = 1000;

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Field errors for a provider being edited; an empty object means it can be saved. */
export function validateProvider(draft: ProviderDraft): ProviderErrors {
  const errors: ProviderErrors = {};
  const url = draft.url.trim();

  if (!url) {
    errors.url = locales.url_required;
  } else if (!isHttpUrl(url)) {
    errors.url = locales.url_invalid;
  }

  if (draft.type !== 'ollama' && !draft.apiKey?.trim()) {
    errors.apiKey = locales.api_key_required;
  }

  if (
    draft.timeout !== undefined &&
    !(Number.isInteger(draft.timeout) && draft.timeout >= 1 && draft.timeout <= MAX_TIMEOUT)
  ) {
    errors.timeout = locales.timeout_invalid;
  }

  if (!draft.model.trim()) {
    errors.model = locales.ai_model_required;
  }

  return errors;
}
