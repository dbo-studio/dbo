import { QueryResponseType } from '@/src/types/Service';
import { http } from '../../core/http/http';

type GetQueryRequest = {
  table: string;
};

export const getQuery = async (payload: GetQueryRequest): Promise<QueryResponseType> => {
  const url = '/query';

  const response = await http.post<QueryResponseType>(url, payload);
  return response.data;
};
