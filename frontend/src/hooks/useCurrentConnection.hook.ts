import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { ConnectionType } from '@/types';
import { useParams } from 'react-router-dom';

export const useCurrentConnection = (): ConnectionType | undefined => {
  const { connectionId } = useParams();
  const { connections } = useConnectionStore();

  return connections?.find((connection) => connection.id === Number(connectionId));
};
