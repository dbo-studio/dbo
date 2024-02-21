import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { ConnectionBoxStyled } from './ConnectionBox.styled';

export default function ConnectionBox() {
  const { currentConnection } = useConnectionStore();
  const [info, setInfo] = useState('');
  const [active, setActive] = useState('false');

  useEffect(() => {
    if (!currentConnection || !currentConnection.current_schema) {
      setInfo(locales.no_active_connection);
      setActive('false');
    } else {
      setInfo(
        currentConnection?.driver +
          ' 15.1: ' +
          currentConnection.current_schema +
          ': ' +
          currentConnection?.name +
          ' SQL Query'
      );
      setActive('true');
    }
  }, [currentConnection]);

  return (
    <ConnectionBoxStyled active={active}>
      <Typography variant='body1' component='h6'>
        {info}
        {/* PostgreSQL 15.1: public: orders: SQL Query */}
      </Typography>
    </ConnectionBoxStyled>
  );
}
