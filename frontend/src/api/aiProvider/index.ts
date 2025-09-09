import { api } from '@/core/api';
import type { AiProviderType } from '@/types';
import type { UpdateProviderRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/providers',
  update: (providerID: string | number): string => `/ai/providers/${providerID}`
};

export const getProviders = async (): Promise<AiProviderType[]> => {
  return (await api.get(endpoint.list())).data.data as AiProviderType[];
};

export const updateProvider = async (
  providerID: string | number,
  data: UpdateProviderRequestType
): Promise<AiProviderType> => {
  return (await api.patch(endpoint.update(providerID), data)).data.data as AiProviderType;
};
