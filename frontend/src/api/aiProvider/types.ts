export type UpdateProviderRequestType = {
  apiKey?: string;
  url?: string;
  isActive?: boolean;
  model?: string;
  timeout?: number;
  models?: string[];
};

export type ProviderModelsRequestType = {
  url?: string;
  apiKey?: string;
  timeout?: number;
};

export type ProviderModelsResponseType = {
  models: string[];
  error?: string;
};
