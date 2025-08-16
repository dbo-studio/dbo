import { api } from '@/core/api';
import type { AIProvider } from '@/types/AiProvider';
import type { UpdateProviderRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/providers',
  update: (providerID: string | number): string => `/ai/providers/${providerID}`
};

export const getProviders = async (): Promise<AIProvider[]> => {
  return (await api.get(endpoint.list())).data.data as AIProvider[];
};

export const updateProvider = async (
  providerID: string | number,
  data: UpdateProviderRequestType
): Promise<AIProvider> => {
  return (await api.patch(endpoint.update(providerID), data)).data.data as AIProvider;
};
