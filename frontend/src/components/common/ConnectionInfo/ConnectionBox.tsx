import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { ConnectionBoxStyled } from './ConnectionBox.styled';

export default function ConnectionBox() {
  const currentConnection = useCurrentConnection();
  const [info, setInfo] = useState('');
  const [active, setActive] = useState('false');
  useEffect(() => {
    if (!currentConnection || !currentConnection.currentSchema) {
      setInfo(locales.no_active_connection);
      setActive('false');
    } else {
      setInfo(
        `${currentConnection?.driver} ${currentConnection?.version} ${currentConnection.currentSchema}: ${currentConnection?.name} SQL Query`
      );
      setActive('true');
    }
  }, [currentConnection]);

  return (
    <ConnectionBoxStyled active={active}>
      <Typography variant='body1' component='h6'>
        {info}
      </Typography>
    </ConnectionBoxStyled>
  );
}
