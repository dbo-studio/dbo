import api from '@/api';
import { TabMode } from '@/core/enums';
import useAPI from '@/hooks/useApi.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import LoadingIconButton from '../../base/LoadingIconButton/LoadingIconButton';

export default function StatusBarActions() {
  const [_, setSearchParams] = useSearchParams();
  const { getSelectedTab } = useTabStore();
  const { currentConnection } = useConnectionStore();

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
    addEmptyEditedColumns,
    updateDesignsQuery
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
          connection_id: currentConnection.id,
          schema: currentConnection.currentSchema,
          database: currentConnection.currentDatabase,
          table: getSelectedTab()?.table,
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
    }

    if (getSelectedTab()?.mode === TabMode.Design) {
      if (!getSelectedTab() || !currentConnection) {
        return;
      }

      try {
        await updateDesignsQuery();
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  const handleAddAction = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      addUnsavedRows();
      setSearchParams({ scrollToBottom: 'true' });
    }

    if (getSelectedTab()?.mode === TabMode.Design) {
      addEmptyEditedColumns();
    }
  };

  const handleRemoveAction = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      updateRemovedRows();
    }

    if (getSelectedTab()?.mode === TabMode.Design) {
      updateRemovedColumns();
    }
  };

  const handleDiscardChanges = async () => {
    if (getSelectedTab()?.mode === TabMode.Data) {
      updateSelectedRows([]);
      restoreEditedRows();
      discardUnsavedRows();
      updateRemovedRows();
    }

    if (getSelectedTab()?.mode === TabMode.Design) {
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
        <LoadingIconButton
          loading={+updateQueryPending || loading}
          disabled={updateQueryPending || loading}
          onClick={handleSave}
        >
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
