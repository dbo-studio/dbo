import api from '@/api';
import { TabMode } from '@/core/enums';
import useAPI from '@/hooks/useApi.hook.ts';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import { Box, IconButton, Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import CustomIcon from '../../../base/CustomIcon/CustomIcon.tsx';
import LoadingIconButton from '../../../base/LoadingIconButton/LoadingIconButton.tsx';

export default function StatusBarActions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSelectedTab } = useTabStore();
  const { currentConnection } = useConnectionStore();

  const {
    loading,
    addUnsavedRows,
    getUnsavedRows,
    getEditedRows,
    getRemovedRows,
    removeEditedRowsByTabId,
    updateRemovedRows,
    restoreEditedRows,
    discardUnsavedRows,
    removeUnsavedRowsByTabId,
    runQuery,
    clearSelectedRows,
    deleteRemovedRowsByTabId
  } = useDataStore();

  const { request: updateQuery, pending: updateQueryPending } = useAPI({
    apiMethod: api.query.updateQuery
  });

  const handleSave = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      const edited = getEditedRows();
      const removed = getRemovedRows();
      const unsaved = getUnsavedRows();

      if (
        !getSelectedTab() ||
        !currentConnection ||
        (edited.length === 0 && removed.length === 0 && unsaved.length === 0)
      ) {
        return;
      }
      try {
        await updateQuery({
          connectionId: currentConnection.id,
          nodeId: getSelectedTab()?.id,
          edited: edited,
          removed: removed,
          added: unsaved
        });
        await runQuery();
        removeEditedRowsByTabId(getSelectedTab()?.id ?? '');
        deleteRemovedRowsByTabId(getSelectedTab()?.id ?? '');
        removeUnsavedRowsByTabId(getSelectedTab()?.id ?? '');
      } catch (error) {
        console.log('🚀 ~ handleSave ~ error:', error);
      }
    }
  };

  const handleAddAction = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      addUnsavedRows();
      searchParams.set('scrollToBottom', 'true');
      setSearchParams(searchParams);
    }
  };

  const handleRemoveAction = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      updateRemovedRows();
    }
  };

  const handleDiscardChanges = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      restoreEditedRows().then();
      discardUnsavedRows();
      deleteRemovedRowsByTabId(getSelectedTab()?.id ?? '');
      clearSelectedRows();
    }
  };

  const handleRefresh = async () => {
    await handleDiscardChanges();
    runQuery().then();
  };

  return (
    <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} width={208}>
      <Box>
        <IconButton disabled={updateQueryPending || loading} onClick={handleAddAction}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton disabled={updateQueryPending || loading} onClick={handleRemoveAction}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <LoadingIconButton onClick={handleSave}>
          <CustomIcon type='check' size='s' />
        </LoadingIconButton>
        <IconButton onClick={handleDiscardChanges} disabled={updateQueryPending || loading}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <LoadingIconButton loading={loading} disabled={updateQueryPending || loading} onClick={handleRefresh}>
          <CustomIcon type='refresh' size='s' />
        </LoadingIconButton>

        {/* <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton> */}
      </Box>
    </Stack>
  );
}
