import type {
  DynamicFieldRequestType,
  DynamicFieldResponse,
  ExecuteActionResponseType,
  FormObjectResponseType,
  ObjectRequestType,
  PreviewExecuteResponseType,
  SaveObjectRequestType,
  TabRequestType,
  TabResponseType,
  TreeRequestType,
  TreeResponseType
} from '@/api/tree/types';
import { api } from '@/core/api';

const endpoints = {
  getTree: (): string => '/tree',
  getTabs: (nodeId: string, action: string): string => `/tree/${nodeId}/tabs/${action}`,
  getObject: (nodeId: string, action: string, tabId: string): string =>
    `/tree/${nodeId}/tabs/${action}/fields/${tabId}/object`,
  executeAction: (nodeId: string, action: string): string => `/tree/${nodeId}/tabs/${action}/fields/object`,
  previewExecute: (nodeId: string, action: string): string => `/tree/${nodeId}/tabs/${action}/fields/object/preview`,
  getDynamicFieldOptions: (nodeId: string): string => `/tree/${nodeId}/dynamic`
};

export const getTree = async (params: TreeRequestType): Promise<TreeResponseType> => {
  return (
    await api.get<{ data: TreeResponseType }>(endpoints.getTree(), {
      params
    })
  ).data.data;
};

export const getTabs = async (params: TabRequestType): Promise<TabResponseType> => {
  return (
    await api.get<{ data: TabResponseType }>(endpoints.getTabs(params.nodeId, params.action), {
      params: {
        connectionId: params.connectionId
      }
    })
  ).data.data;
};

export const getObject = async (params: ObjectRequestType): Promise<FormObjectResponseType> => {
  return (
    await api.get<{ data: FormObjectResponseType }>(endpoints.getObject(params.nodeId, params.action, params.tabId), {
      params: {
        connectionId: params.connectionId
      }
    })
  ).data.data;
};

export const executeAction = async (params: SaveObjectRequestType): Promise<ExecuteActionResponseType> => {
  return (
    (
      await api.post<{ data: ExecuteActionResponseType | null }>(
        endpoints.executeAction(params.nodeId, params.action),
        params.data,
        {
          params: {
            connectionId: params.connectionId,
            confirmed: params.confirmed ? true : undefined
          }
        }
      )
    ).data.data ?? {}
  );
};

export const previewExecute = async (params: SaveObjectRequestType): Promise<PreviewExecuteResponseType> => {
  return (
    await api.post<{ data: PreviewExecuteResponseType }>(
      endpoints.previewExecute(params.nodeId, params.action),
      params.data,
      {
        params: {
          connectionId: params.connectionId
        }
      }
    )
  ).data.data;
};

export const getDynamicFieldOptions = async (
  params: DynamicFieldRequestType,
  signal?: AbortSignal
): Promise<DynamicFieldResponse> => {
  return (
    await api.get<{ data: DynamicFieldResponse }>(endpoints.getDynamicFieldOptions(params.nodeId), {
      params: {
        connectionId: params.connectionId,
        ...params.parameters
      },
      signal
    })
  ).data.data;
};
