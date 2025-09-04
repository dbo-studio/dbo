export type UpdateProviderRequestType = {
  apiKey?: string;
  url?: string;
  isActive?: boolean;
  model?: string;
  timeout?: number;
  models?: string[];
};
