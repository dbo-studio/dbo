import api from '@/src/core/services/api';
import {
  CREATE_CONNECTION,
  DELETE_CONNECTION,
  GET_CONNECTION_DETAIL,
  GET_CONNECTION_LIST,
  TEST_CONNECTION,
  UPDATE_CONNECTION
} from './endpoints';
import { transformConnectionDetail, transformConnections } from './transformers';
import { createConnectionType, updateConnectionType } from './types';

export const getConnectionList = async () => {
  return api.get(GET_CONNECTION_LIST()).then(transformConnections);
};

export const getConnectionDetail = async (connectionID: string | number) => {
  return api.get(GET_CONNECTION_DETAIL(connectionID)).then(transformConnectionDetail);
};

export const createConnection = async (data: createConnectionType) => {
  return api
    .post(CREATE_CONNECTION(), {
      ...data,
      port: Number(data.port)
    })
    .then(transformConnectionDetail);
};

export const updateConnection = async (data: updateConnectionType) => {
  return api
    .patch(UPDATE_CONNECTION(data.id), {
      ...data,
      port: Number(data.port)
    })
    .then(transformConnectionDetail);
};

export const deleteConnection = async (connectionId: string | number) => {
  return api.del(DELETE_CONNECTION(connectionId)).then(transformConnections);
};

export const testConnection = async (data: createConnectionType) => {
  return api.post(TEST_CONNECTION(), {
    ...data,
    port: Number(data.port)
  });
};
