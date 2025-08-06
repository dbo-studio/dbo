import { api } from '@/core/api';

const endpoint = {
  detail: (jobId: string): string => `/jobs/${jobId}`,
  cancel: (jobId: string): string => `/jobs/${jobId}`,
  result: (jobId: string): string => `/jobs/${jobId}/result`
};

export const detail = async (jobId: string) => {
  const response = await api.get(endpoint.detail(jobId));
  return response.data.data;
};

export const cancel = async (jobId: string) => {
  const response = await api.delete(endpoint.cancel(jobId));
  return response.data;
};

export const result = async (jobId: string) => {
  const response = await api.get(endpoint.result(jobId), {
    responseType: 'blob'
  });

  return response.data;
};
