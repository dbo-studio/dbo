import { api } from '@/core/api';
import type {
  BackupArtifactType,
  BackupJobResponseType,
  BackupRequestType,
  BackupScheduleRequestType,
  BackupScheduleType,
  BackupToolDownloadType,
  BackupToolType,
  BackupVerifyResultType,
  RestoreRequestType
} from './types';

const endpoint = {
  create: (): string => '/backups',
  restore: (): string => '/backups/restore',
  upload: (): string => '/backups/upload',
  history: (): string => '/backups/history',
  download: (id: number): string => `/backups/${id}/download`,
  verify: (id: number): string => `/backups/${id}/verify`,
  tools: (): string => '/backups/tools',
  toolDownloads: (): string => '/backups/tools/downloads',
  installTool: (): string => '/backups/tools/install',
  removeTool: (driver: string, version: string): string => `/backups/tools/${driver}/${version}`,
  schedules: (): string => '/backup-schedules',
  schedule: (id: number): string => `/backup-schedules/${id}`,
  runSchedule: (id: number): string => `/backup-schedules/${id}/run`
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

export const removeTool = async (driver: string, version: string): Promise<void> => {
  await api.delete(endpoint.removeTool(driver, version));
};

export const schedules = async (): Promise<BackupScheduleType[]> => {
  return (await api.get<{ data: BackupScheduleType[] }>(endpoint.schedules())).data.data;
};

export const createSchedule = async (request: BackupScheduleRequestType): Promise<BackupScheduleType> => {
  return (await api.post<{ data: BackupScheduleType }>(endpoint.schedules(), request)).data.data;
};

export const updateSchedule = async (
  id: number,
  patch: Partial<BackupScheduleRequestType> & { enabled?: boolean }
): Promise<BackupScheduleType> => {
  return (await api.patch<{ data: BackupScheduleType }>(endpoint.schedule(id), patch)).data.data;
};

export const deleteSchedule = async (id: number): Promise<void> => {
  await api.delete(endpoint.schedule(id));
};

export const runSchedule = async (id: number): Promise<BackupJobResponseType> => {
  return (await api.post<{ data: BackupJobResponseType }>(endpoint.runSchedule(id))).data.data;
};

export const verify = async (id: number, passphrase?: string): Promise<BackupVerifyResultType> => {
  return (await api.post<{ data: BackupVerifyResultType }>(endpoint.verify(id), { passphrase })).data.data;
};
