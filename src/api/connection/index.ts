import api from '@/src/services/api';
import { GET_CONNECTION_DATA } from './endpoints';
import { transformConnectionData } from './transformers';

export const getConnectionData = (connectionID: string | number) => {
  return api.get(GET_CONNECTION_DATA(connectionID)).then(transformConnectionData);
};
