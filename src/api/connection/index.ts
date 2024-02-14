import api from '@/src/core/services/api';
import { GET_CONNECTION_DETAIL, GET_CONNECTION_LIST } from './endpoints';
import { transformConnectionDetail, transformConnections } from './transformers';

export const getConnectionList = () => {
  return api.get(GET_CONNECTION_LIST()).then(transformConnections);
};

export const getConnectionDetail = (connectionID: string | number) => {
  return api.get(GET_CONNECTION_DETAIL(connectionID)).then(transformConnectionDetail);
};
