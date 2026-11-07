import { api } from '@/core/api';
import type { ExportRequestType, ImportPreviewType, ImportRequestType, JobResponseType } from './types';

const endpoint = {
  import: (): string => '/import',
  importPreview: (): string => '/import/preview',
  export: (): string => '/export'
};

export const importData = async (request: ImportRequestType): Promise<JobResponseType> => {
  const formData = new FormData();
  formData.append('data', request.data);
  formData.append('connectionId', request.connectionId.toString());
  formData.append('table', request.table);
  formData.append('format', request.format);
  if (request.delimiter) formData.append('delimiter', request.delimiter);
  if (request.mapping) formData.append('mapping', JSON.stringify(request.mapping));
  formData.append('continueOnError', request.continueOnError.toString());
  formData.append('skipErrors', request.skipErrors.toString());
  formData.append('maxErrors', request.maxErrors.toString());

  const response = await api.post<{ data: JobResponseType }>(endpoint.import(), formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data.data;
};

export const exportData = async (request: ExportRequestType): Promise<JobResponseType> => {
  return (await api.post<{ data: JobResponseType }>(endpoint.export(), request)).data.data;
};

export const previewImport = async (data: File, format: string, delimiter?: string): Promise<ImportPreviewType> => {
  const formData = new FormData();
  formData.append('data', data);
  formData.append('format', format);
  if (delimiter) formData.append('delimiter', delimiter);

  return (
    await api.post<{ data: ImportPreviewType }>(endpoint.importPreview(), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  ).data.data;
};
