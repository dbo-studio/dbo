import type { AiProviderType } from '@/types';

export const PROVIDER_NAMES: Record<AiProviderType['type'], string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  ollama: 'Ollama'
};
