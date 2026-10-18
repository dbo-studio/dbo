import { api } from '@/core/api';
import type {
  BackupArtifactType,
  BackupJobResponseType,
  BackupRequestType,
  BackupToolDownloadType,
  BackupToolType,
  RestoreRequestType
} from './types';

const endpoint = {
  create: (): string => '/backups',
  restore: (): string => '/backups/restore',
  upload: (): string => '/backups/upload',
  history: (): string => '/backups/history',
  download: (id: number): string => `/backups/${id}/download`,
  tools: (): string => '/backups/tools',
  toolDownloads: (): string => '/backups/tools/downloads',
  installTool: (): string => '/backups/tools/install'
};

export const create = async (request: BackupRequestType): Promise<BackupJobResponseType> => {
  return (await api.post<{ data: BackupJobResponseType }>(endpoint.create(), request)).data.data;
};

export const restore = async (request: RestoreRequestType): Promise<BackupJobResponseType> => {
  return (await api.post<{ data: BackupJobResponseType }>(endpoint.restore(), request)).data.data;
};

export const upload = async (connectionId: number, file: File, note?: string): Promise<BackupArtifactType> => {
  const formData = new FormData();
  formData.append('connectionId', connectionId.toString());
  formData.append('file', file);
  if (note) {
    formData.append('note', note);
  }

  return (
    await api.post<{ data: BackupArtifactType }>(endpoint.upload(), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  ).data.data;
};

export const history = async (connectionId: number): Promise<BackupArtifactType[]> => {
  return (await api.get<{ data: BackupArtifactType[] }>(endpoint.history(), { params: { connectionId } })).data.data;
};

export const download = async (id: number): Promise<Blob> => {
  return (await api.get<Blob>(endpoint.download(id), { responseType: 'blob' })).data;
};

export const tools = async (): Promise<BackupToolType[]> => {
  return (await api.get<{ data: BackupToolType[] }>(endpoint.tools())).data.data;
};

export const toolDownloads = async (): Promise<BackupToolDownloadType[]> => {
  return (await api.get<{ data: BackupToolDownloadType[] }>(endpoint.toolDownloads())).data.data;
};

export const installTool = async (driver: string, version: string): Promise<BackupJobResponseType> => {
  return (await api.post<{ data: BackupJobResponseType }>(endpoint.installTool(), { driver, version })).data.data;
};
