export type AiProviderType = {
  id: number;
  type: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
  apiKey?: string;
  url: string;
  models?: string[];
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
};
