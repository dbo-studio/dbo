import type {
  GetObjectDetailRequestType,
  GetObjectRequestType,
  TreeRequestType,
  TreeResponseType
} from '@/api/object/types.ts';
import { api } from '@/core/api';

const endpoints = {
  getTree: () => '/tree',
  getObject: () => '/tree/object',
  getObjectDetail: () => '/tree/object-detail'
};

export const getTree = async (params: TreeRequestType): Promise<TreeResponseType> => {
  return (
    await api.get(endpoints.getTree(), {
      params
    })
  ).data.data as TreeResponseType;
};

export const getObject = async (params: GetObjectRequestType) => {
  return (
    await api.get(endpoints.getObject(), {
      params
    })
  ).data.data;
};

export const getObjectDetail = async (params: GetObjectDetailRequestType) => {
  return (
    await api.get(endpoints.getObjectDetail(), {
      params
    })
  ).data.data;
};
