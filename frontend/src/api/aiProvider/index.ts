import { api } from '@/core/api';
import type { AiProviderType } from '@/types';
import type { UpdateProviderRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/providers',
  update: (providerID: string | number): string => `/ai/providers/${providerID}`
};

export const getProviders = async (): Promise<AiProviderType[]> => {
  return (await api.get<{ data: AiProviderType[] }>(endpoint.list())).data.data;
};

export const updateProvider = async (
  providerID: string | number,
  data: UpdateProviderRequestType
): Promise<AiProviderType> => {
  return (await api.patch<{ data: AiProviderType }>(endpoint.update(providerID), data)).data.data;
};
