import api from '@/src/core/services/api';
import { CREATE_CONNECTION, DELETE_CONNECTION, GET_CONNECTION_DETAIL, GET_CONNECTION_LIST } from './endpoints';
import { transformConnectionDetail, transformConnections } from './transformers';
import { createConnectionType } from './types';

export const getConnectionList = () => {
  return api.get(GET_CONNECTION_LIST()).then(transformConnections);
};

export const getConnectionDetail = (connectionID: string | number) => {
  return api.get(GET_CONNECTION_DETAIL(connectionID)).then(transformConnectionDetail);
};

export const createConnection = (data: createConnectionType) => {
  return api.post(CREATE_CONNECTION(), {
    ...data,
    port: Number(data.port)
  });
};

export const deleteConnection = (connectionId: string | number) => {
  return api.del(DELETE_CONNECTION(connectionId));
};
