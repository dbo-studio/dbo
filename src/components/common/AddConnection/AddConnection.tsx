import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { AddConnectionModalStyled, AddConnectionStyled } from './AddConnection.styled';
import ConnectionSelection from './ConnectionSelection';
import ConnectionSetting from './ConnectionSettings';
import { ConnectionType } from './types';

const connectionTypes: ConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: '/images/connections/postgresql_logo.svg'
  }
];

export default function AddConnection() {
  const { connections, updateShowAddConnection, showAddConnection } = useConnectionStore();
  const [connectionType, setConnectionType] = useState<ConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!connections || connections.length == 0) {
      updateShowAddConnection(true);
    } else {
      updateShowAddConnection(false);
    }
  }, [connections]);

  const handleClose = () => {
    setConnectionType(undefined);
    updateShowAddConnection(false);
  };

  const handleStep = () => {
    if (step == 0) {
      setStep(1);
    }
  };

  return (
    <AddConnectionModalStyled open={showAddConnection}>
      <AddConnectionStyled>
        <Box>
          <Typography variant='h6'>{locales.new_connection}</Typography>
        </Box>
        {step == 0 && <ConnectionSelection connections={connectionTypes} onChange={setConnectionType} />}
        {step == 1 && <ConnectionSetting connection={connectionType} />}
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={handleClose}>
            {locales.cancel}
          </Button>
          <Button onClick={handleStep} disabled={!connectionType} size='small' variant='contained'>
            {locales.create}
          </Button>
        </Box>
      </AddConnectionStyled>
    </AddConnectionModalStyled>
  );
}
