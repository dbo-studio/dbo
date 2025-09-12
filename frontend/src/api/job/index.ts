import { api } from '@/core/api';
import type { JobDetailResponse } from './types';

const endpoint = {
  detail: (jobId: string): string => `/jobs/${jobId}`,
  cancel: (jobId: string): string => `/jobs/${jobId}`,
  result: (jobId: string): string => `/jobs/${jobId}/result`
};

export const detail = async (jobId: string): Promise<JobDetailResponse> => {
  return (await api.get(endpoint.detail(jobId))).data.data as JobDetailResponse;
};

export const cancel = async (jobId: string): Promise<void> => {
  await api.delete(endpoint.cancel(jobId));
};

export const result = async (jobId: string): Promise<Blob> => {
  const response = await api.get(endpoint.result(jobId), {
    responseType: 'blob'
  });

  return response.data;
};
