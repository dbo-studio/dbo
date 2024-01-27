import { ConnectionResponseType, ConnectionsResponseType } from '@/src/types/Service';
import { http } from '../../core/http/http';

export const getConnections = async (): Promise<ConnectionsResponseType> => {
  const url = '/connections';

  const response = await http.get<ConnectionsResponseType>(url);
  return response.data;
};

export const getConnection = async (id: number): Promise<ConnectionResponseType> => {
  const url = `/connections/${id}`;

  const response = await http.get<ConnectionResponseType>(url);
  return response.data;
};
