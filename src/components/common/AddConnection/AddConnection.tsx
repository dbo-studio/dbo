import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useEffect } from 'react';
import { AddConnectionStyled } from './AddConnection.styled';

export default function AddConnection() {
  const { connections, updateShowAddConnection, showAddConnection } = useConnectionStore();
  useEffect(() => {
    if (!connections || connections.length == 0) {
      updateShowAddConnection(true);
    } else {
      updateShowAddConnection(false);
    }
  }, [connections, showAddConnection, updateShowAddConnection]);

  return (
    <>
      {showAddConnection && (
        <AddConnectionStyled>
          <div>add Connection</div>
        </AddConnectionStyled>
      )}
    </>
  );
}
