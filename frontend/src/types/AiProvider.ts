export type AiProviderType = {
  id: number;
  type: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
  apiKey?: string;
  url: string;
  models: string[];
  timeout?: number;
  isActive: boolean;
  model: string;
  lastUsedAt: string;
};
