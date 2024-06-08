import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import { useConfirmModalStore } from '@/src/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { Box, Button, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import { SelectDatabaseProps } from '../types';
import DatabaseItem from './DatabaseItem';

export default function SelectDatabase({ onClose, onChangeStep }: SelectDatabaseProps) {
  const { currentConnection, updateCurrentConnection } = useConnectionStore();
  const [selectedDB, setSelectedDB] = useState<string | undefined>(undefined);
  const showModal = useConfirmModalStore((state) => state.show);

  useEffect(() => {
    setSelectedDB(currentConnection?.currentDatabase);
  }, [currentConnection]);

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  const handelChangeDatabase = () => {
    const c = currentConnection;
    if (!c || !selectedDB) {
      return;
    }

    c.currentDatabase = selectedDB;
    updateConnection({
      id: c.id,
      current_database: selectedDB
    }).then((res) => {
      updateCurrentConnection(res);
      onClose();
    });
  };

  const { request: deleteDatabase } = useAPI({
    apiMethod: api.database.deleteDatabase
  });

  const handleConfirmDelete = (db: string) => {
    showModal(locales.delete_action, locales.database_delete_confirm, () => {
      handleDeleteDatabase(db);
    });
  };

  const handleDeleteDatabase = async (db: string) => {
    try {
      const c = currentConnection!;
      c.databases = c?.databases?.filter((v) => v !== db);
      await deleteDatabase({ connection_id: currentConnection!.id, name: db });
      updateCurrentConnection(c);
      toast.success(locales.database_delete_success);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <Box flex={1} maxHeight={300} overflow={'auto'}>
        {currentConnection?.databases?.map((db: string) => (
          <DatabaseItem
            onDelete={() => handleConfirmDelete(db)}
            onClick={() => setSelectedDB(db)}
            name={db}
            key={uuid()}
            selected={db == selectedDB}
          />
        ))}
      </Box>
      <Box display={'flex'} justifyContent={'space-between'}>
        <Button size='small' onClick={() => onClose()}>
          {locales.cancel}
        </Button>
        <Stack spacing={1} direction={'row'}>
          <Button onClick={() => onChangeStep()} size='small' variant='contained' color='secondary'>
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
