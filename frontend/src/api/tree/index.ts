import type {
  DynamicFieldRequestType,
  DynamicFieldResponse,
  FormObjectResponseType,
  ObjectRequestType,
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

export const executeAction = async (params: SaveObjectRequestType): Promise<void> => {
  await api.post(endpoints.executeAction(params.nodeId, params.action), params.data, {
    params: {
      connectionId: params.connectionId
    },
    data: {
      ...params.data
    }
  });
};

export const getDynamicFieldOptions = async (params: DynamicFieldRequestType): Promise<DynamicFieldResponse> => {
  return (
    await api.get<{ data: DynamicFieldResponse }>(endpoints.getDynamicFieldOptions(params.nodeId), {
      params: {
        connectionId: params.connectionId,
        ...params.parameters
      }
    })
  ).data.data;
};
