import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import ConnectionSelection from '../ConnectionSelection/ConnectionSelection';
import ConnectionSetting from '../ConnectionSettings';
import { ConnectionType } from '../types';
import { AddConnectionModalStyled, AddConnectionStyled } from './AddConnection.styled';

const connectionTypes: ConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: '/images/connections/postgresql_logo.svg'
  }
];

export default function AddConnection() {
  const { updateShowAddConnection, showAddConnection } = useConnectionStore();
  const [connectionType, setConnectionType] = useState<ConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setConnectionType(undefined);
    updateShowAddConnection(false);
    setStep(0);
  };

  const handleSetConnection = (connection: ConnectionType | undefined) => {
    setConnectionType(connection);
    setStep(1);
  };

  return (
    <AddConnectionModalStyled open={showAddConnection}>
      <AddConnectionStyled>
        <Box>
          <Typography variant='h6'>{locales.new_connection}</Typography>
        </Box>
        {step == 0 && (
          <ConnectionSelection onClose={handleClose} onSubmit={handleSetConnection} connections={connectionTypes} />
        )}
        {step == 1 && connectionTypes && <ConnectionSetting onClose={handleClose} connection={connectionType} />}
      </AddConnectionStyled>
    </AddConnectionModalStyled>
  );
}
