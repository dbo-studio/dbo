import api from '@/src/api';
import { TabMode } from '@/src/core/enums';
import useAPI from '@/src/hooks/useApi.hook';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, IconButton, Stack } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import LoadingIconButton from '../../base/LoadingIconButton/LoadingIconButton';

export default function StatusBarActions() {
  const { selectedTab } = useTabStore();
  const {
    loading,
    addUnsavedRows,
    getUnsavedRows,
    getEditedRows,
    getRemovedRows,
    updateEditedRows,
    updateRemovedRows,
    restoreEditedRows,
    discardUnsavedRows,
    updateSelectedRows,
    updateUnsavedRows,
    runQuery,
    restoreEditedColumns,
    updateRemovedColumns,
    addEmptyEditedColumns
  } = useDataStore();

  const { currentConnection } = useConnectionStore();

  const { request: updateQuery, pending: updateQueryPending } = useAPI({
    apiMethod: api.query.updateQuery
  });

  const handleSave = async () => {
    const edited = getEditedRows();
    const removed = getRemovedRows();
    const unsaved = getUnsavedRows();

    if (!selectedTab || !currentConnection || (edited.length == 0 && removed.length == 0 && unsaved.length == 0)) {
      return;
    }
    try {
      await updateQuery({
        connection_id: currentConnection.id,
        schema: currentConnection.currentSchema,
        database: currentConnection.currentDatabase,
        table: selectedTab?.table,
        edited: edited,
        removed: removed,
        added: unsaved
      });
      updateEditedRows([]);
      updateRemovedRows();
      updateUnsavedRows([]);
      updateSelectedRows([]);
      await runQuery();
    } catch (error) {
      console.log('🚀 ~ handleSave ~ error:', error);
    }
  };

  const handleAddAction = () => {
    if (selectedTab?.mode == TabMode.Data) {
      addUnsavedRows();
    }

    if (selectedTab?.mode == TabMode.Design) {
      addEmptyEditedColumns();
    }
  };

  const handleRemoveAction = () => {
    if (selectedTab?.mode == TabMode.Data) {
      updateRemovedRows();
    }

    if (selectedTab?.mode == TabMode.Design) {
      updateRemovedColumns();
    }
  };

  const handleDiscardChanges = () => {
    if (selectedTab?.mode == TabMode.Data) {
      updateRemovedRows();
      restoreEditedRows();
      discardUnsavedRows();
      updateSelectedRows([]);
    }

    if (selectedTab?.mode == TabMode.Design) {
      restoreEditedColumns();
    }
  };

  const handleRefresh = () => {
    runQuery();
  };

  return (
    <Stack direction={'row'} mb={'5px'} justifyContent={'space-between'} width={208}>
      <Box>
        <IconButton disabled={updateQueryPending || loading} onClick={handleAddAction}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton disabled={updateQueryPending || loading} onClick={handleRemoveAction}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <LoadingIconButton loading={+updateQueryPending} disabled={updateQueryPending || loading} onClick={handleSave}>
          <CustomIcon type='check' size='s' />
        </LoadingIconButton>
        <IconButton onClick={handleDiscardChanges} disabled={updateQueryPending || loading}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <LoadingIconButton loading={+loading} disabled={updateQueryPending || loading} onClick={handleRefresh}>
          <CustomIcon type='refresh' size='s' />
        </LoadingIconButton>

        {/* <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton> */}
      </Box>
    </Stack>
  );
}
