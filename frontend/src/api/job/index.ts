import { api } from '@/core/api';
import type { JobDetailResponseType } from './types';

const endpoint = {
  detail: (jobId: string): string => `/jobs/${jobId}`,
  cancel: (jobId: string): string => `/jobs/${jobId}`,
  result: (jobId: string): string => `/jobs/${jobId}/result`
};

export const detail = async (jobId: string): Promise<JobDetailResponseType> => {
  return (await api.get<{ data: JobDetailResponseType }>(endpoint.detail(jobId))).data.data;
};

/** Jobs of the signed-in user that have not ended. */
export const active = async (): Promise<JobDetailResponseType[]> => {
  return (await api.get<{ data: JobDetailResponseType[] }>('/jobs/active')).data.data;
};

/** Starts an ended import or export again; returns the new job's id. */
export const retry = async (jobId: string): Promise<number> => {
  return (await api.post<{ data: { jobId: number } }>(`/jobs/${jobId}/retry`)).data.data.jobId;
};

export const cancel = async (jobId: string): Promise<void> => {
  await api.delete(endpoint.cancel(jobId));
};

export const result = async (jobId: string): Promise<Blob> => {
  const response = await api.get<Blob>(endpoint.result(jobId), {
    responseType: 'blob'
  });

  return response.data;
};
