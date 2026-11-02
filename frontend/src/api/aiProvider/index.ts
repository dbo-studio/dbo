import { api } from '@/core/api';
import type { AiProviderType } from '@/types';
import type { ProviderModelsRequestType, ProviderModelsResponseType, UpdateProviderRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/providers',
  update: (providerID: string | number): string => `/ai/providers/${providerID}`,
  models: (providerID: string | number): string => `/ai/providers/${providerID}/models`
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

export const listProviderModels = async (
  providerID: string | number,
  data: ProviderModelsRequestType
): Promise<ProviderModelsResponseType> => {
  return (await api.post<{ data: ProviderModelsResponseType }>(endpoint.models(providerID), data)).data.data;
};
