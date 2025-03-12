import type {
  FieldRequestType,
  FieldResponseType,
  ObjectRequestType,
  ObjectResponseType,
  TabRequestType,
  TabResponseType,
  TreeRequestType,
  TreeResponseType
} from '@/api/tree/types';
import { api } from '@/core/api';

const endpoints = {
  getTree: () => '/tree',
  getTabs: (nodeId: string, action: string) => `/tree/${nodeId}/tabs/${action}`,
  getFields: (nodeId: string, action: string, tabId: string) => `/tree/${nodeId}/tabs/${action}/fields/${tabId}`,
  getObject: (nodeId: string, action: string, tabId: string) => `/tree/${nodeId}/tabs/${action}/fields/${tabId}/object`
};

export const getTree = async (params: TreeRequestType): Promise<TreeResponseType> => {
  return (
    await api.get(endpoints.getTree(), {
      params
    })
  ).data.data as TreeResponseType;
};

export const getTabs = async (params: TabRequestType): Promise<TabResponseType> => {
  return (
    await api.get(endpoints.getTabs(params.nodeId, params.action), {
      params: {
        connectionId: params.connectionId
      }
    })
  ).data.data as TabResponseType;
};

export const getFields = async (params: FieldRequestType): Promise<FieldResponseType> => {
  return (
    await api.get(endpoints.getFields(params.nodeId, params.action, params.tabId), {
      params: {
        connectionId: params.connectionId
      }
    })
  ).data.data as FieldResponseType;
};

export const getObject = async (params: ObjectRequestType) => {
  return (
    await api.get(endpoints.getObject(params.nodeId, params.action, params.tabId), {
      params: {
        connectionId: params.connectionId
      }
    })
  ).data.data as ObjectResponseType;
};
