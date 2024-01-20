import { QueryResponseType } from '@/src/types/Service';
import { http } from '../http/http';

type GetQueryRequest = {
  table: string;
};

export const getQuery = async (payload: GetQueryRequest): Promise<QueryResponseType> => {
  const url = 'http://localhost:8080/api/query';

  const response = await http.post<QueryResponseType>(url, payload);
  return response.data;
};
