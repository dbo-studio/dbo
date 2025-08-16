export type AIProvider = {
  id: number;
  type: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
  apiKey?: string;
  url: string;
  models?: string[];
  temperature?: number;
  maxTokens?: number;
};
