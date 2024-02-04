import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { ConnectionBoxStyled } from './ConnectionBox.styled';

export default function ConnectionBox() {
  const { currentConnection, getCurrentSchema } = useConnectionStore();
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!currentConnection || !getCurrentSchema()) {
      setInfo(locales.no_active_connection);
    } else {
      setInfo(
        currentConnection?.driver + ' 15.1: ' + getCurrentSchema()?.name + ': ' + currentConnection?.name + ' SQL Query'
      );
    }
  }, [currentConnection, getCurrentSchema()]);

  return (
    <ConnectionBoxStyled active={info !== locales.no_active_connection}>
      <Typography variant='body1' component='h6'>
        {info}
        {/* PostgreSQL 15.1: public: orders: SQL Query */}
      </Typography>
    </ConnectionBoxStyled>
  );
}
