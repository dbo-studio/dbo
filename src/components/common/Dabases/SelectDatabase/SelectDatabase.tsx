import locales from '@/src/locales';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Button, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { SelectDatabaseProps } from '../types';
import DatabaseItem from './DatabaseItem';

export default function SelectDatabase({ onClose }: SelectDatabaseProps) {
  const { currentConnection, updateCurrentConnection } = useConnectionStore();
  const [selectedDB, setSelectedDB] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedDB(currentConnection?.current_database);
  }, [currentConnection]);

  const handelChangeDatabase = () => {
    const c = currentConnection;
    if (!c || !selectedDB) {
      return;
    }
    c.current_database = selectedDB;
    updateCurrentConnection(c);
    onClose();
  };

  return (
    <>
      <Box flex={1}>
        {currentConnection?.databases?.map((db: string) => (
          <DatabaseItem onClick={() => setSelectedDB(db)} name={db} key={uuid()} selected={db == selectedDB} />
        ))}
      </Box>
      <Box display={'flex'} justifyContent={'space-between'}>
        <Button size='small' onClick={() => onClose()}>
          {locales.cancel}
        </Button>
        <Stack spacing={1} direction={'row'}>
          <Button onClick={() => {}} size='small' variant='contained' color='secondary'>
            {locales.new}
          </Button>
          <Button disabled={!selectedDB} onClick={handelChangeDatabase} size='small' variant='contained'>
            {locales.open}
          </Button>
        </Stack>
      </Box>
    </>
  );
}
