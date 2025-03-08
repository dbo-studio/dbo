import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Stack } from '@mui/material';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import type { SelectDatabaseProps } from '../types';
import DatabaseItem from './DatabaseItem';

export default function SelectDatabase({ onClose, onChangeStep }: SelectDatabaseProps) {
  const { updateCurrentConnection, currentConnection } = useConnectionStore();
  const [selectedDB, setSelectedDB] = useState<string | undefined>(undefined);
  const showModal = useConfirmModalStore((state) => state.danger);

  useEffect(() => {
    setSelectedDB(currentConnection?.currentDatabase);
  }, [currentConnection]);

  const { request: updateConnection, pending: pendingUpdate } = useAPI({
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

  const { request: deleteDatabase, pending: pendingDelete } = useAPI({
    apiMethod: api.database.deleteDatabase
  });

  const handleConfirmDelete = (db: string) => {
    showModal(locales.delete_action, locales.database_delete_confirm, () => {
      handleDeleteDatabase(db).then();
    });
  };

  const handleDeleteDatabase = async (db: string) => {
    if (!currentConnection || pendingDelete) {
      return;
    }

    try {
      const c = currentConnection;
      await deleteDatabase({ connectionId: c.id, name: db });
      c.databases = c.databases?.filter((v) => v !== db);
      updateCurrentConnection(c);
      toast.success(locales.database_delete_success);
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.message);
      }
      console.log('🚀 ~ SelectDatabase.tsx: ~ err:', err);
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
            selected={db === selectedDB}
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
          <LoadingButton
            loading={pendingUpdate}
            disabled={!selectedDB}
            onClick={handelChangeDatabase}
            size='small'
            variant='contained'
          >
            {locales.open}
          </LoadingButton>
        </Stack>
      </Box>
    </>
  );
}
