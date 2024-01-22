import { ConnectionResponseType } from '@/src/types/Service';
import { http } from '../../core/http/http';

export const getConnections = async (): Promise<ConnectionResponseType> => {
  const url = '/connections';

  const response = await http.get<ConnectionResponseType>(url);
  return response.data;
};
