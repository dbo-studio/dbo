import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { TabMode } from '@/src/types';
import { Box, IconButton, Stack } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import LoadingIconButton from '../../base/LoadingIconButton/LoadingIconButton';

export default function StatusBarActions() {
  const { selectedTab } = useTabStore();
  const {
    addUnsavedRows,
    getEditedRows,
    getRemovedRows,
    getSelectedRows,
    applyRemovedRows,
    updateEditedRows,
    updateRemovedRows,
    restoreEditedRows,
    discardUnsavedRows,
    updateSelectedRows,
    runQuery
  } = useDataStore();

  const { currentConnection } = useConnectionStore();

  const { request: updateQuery, pending: updateQueryPending } = useAPI({
    apiMethod: api.query.updateQuery
  });

  const handleSave = async () => {
    if (!selectedTab || !currentConnection || (getEditedRows().length == 0 && getRemovedRows().length == 0)) {
      return;
    }
    try {
      await updateQuery({
        connection_id: currentConnection.id,
        schema: currentConnection.currentSchema,
        database: currentConnection.currentDatabase,
        table: selectedTab?.table,
        edited: getEditedRows(),
        removed: getRemovedRows()
      });
      updateEditedRows([]);
      applyRemovedRows();
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddAction = () => {
    if (selectedTab?.mode == TabMode.Data) {
      addUnsavedRows();
    }
  };

  const handleRemoveAction = () => {
    if (selectedTab?.mode == TabMode.Data) {
      updateRemovedRows(Array.from(getSelectedRows()));
    }
  };

  const handleDiscardChanges = () => {
    if (selectedTab?.mode == TabMode.Data) {
      updateRemovedRows([]);
      restoreEditedRows();
      discardUnsavedRows();
      updateSelectedRows([]);
    }
  };

  const handleRefresh = () => {
    if (selectedTab?.mode == TabMode.Data) {
      runQuery();
    }
  };

  return (
    <Stack direction={'row'} mb={'5px'} justifyContent={'space-between'} width={208}>
      <Box>
        <IconButton onClick={handleAddAction}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton onClick={handleRemoveAction}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <LoadingIconButton
          loading={updateQueryPending ? true : undefined}
          disabled={updateQueryPending}
          onClick={handleSave}
        >
          <CustomIcon type='check' size='s' />
        </LoadingIconButton>
        <IconButton onClick={handleDiscardChanges}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <IconButton onClick={handleRefresh}>
          <CustomIcon type='refresh' size='s' />
        </IconButton>

        {/* <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton> */}
      </Box>
    </Stack>
  );
}
