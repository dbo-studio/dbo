import { api } from '@/core/api';
import type { ExportRequestType, ImportRequestType, JobResponseType } from './types';

const endpoint = {
    import: (): string => '/import',
    export: (): string => '/export',
};

export const importData = async (request: ImportRequestType): Promise<JobResponseType> => {
    const formData = new FormData();
    formData.append('data', request.data);
    formData.append('connectionId', request.connectionId.toString());
    formData.append('table', request.table);
    formData.append('format', request.format);
    formData.append('continueOnError', request.continueOnError.toString());
    formData.append('skipErrors', request.skipErrors.toString());
    formData.append('maxErrors', request.maxErrors.toString());

    const response = await api.post(endpoint.import(), formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });

    return response.data.data as JobResponseType;
};

export const exportData = async (request: ExportRequestType): Promise<JobResponseType> => {
    return (await api.post(endpoint.export(), request)).data.data as JobResponseType;
};