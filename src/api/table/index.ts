import api from '@/src/services/api';
import { GET_TABLE_DATA } from './endpoints';
import { transformTableData } from './transformers';

export const getTableData = () => {
  return api.get(GET_TABLE_DATA).then(transformTableData);
};
