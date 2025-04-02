import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks/useCurrentConnection.tsx';
import { useSelectedTab } from '@/hooks/useSelectedTab.tsx';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { Box, IconButton, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function StatusBarActions(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = useSelectedTab();
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

  const { mutateAsync: updateQueryMutation, isPending: updateQueryPending } = useMutation({
    mutationFn: api.query.updateQuery,
    onSuccess: async (): Promise<void> => {
      await runQuery();
      removeEditedRowsByTabId(selectedTab?.id ?? '');
      deleteRemovedRowsByTabId(selectedTab?.id ?? '');
      removeUnsavedRowsByTabId(selectedTab?.id ?? '');
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ updateQueryMutation ~ error:', error);
    }
  });

  const handleSave = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      const edited = getEditedRows();
      const removed = getRemovedRows();
      const unsaved = getUnsavedRows();

      if (!selectedTab || !currentConnection || (edited.length === 0 && removed.length === 0 && unsaved.length === 0)) {
        return;
      }
      try {
        await updateQueryMutation({
          connectionId: currentConnection.id,
          nodeId: selectedTab.id,
          edited: edited,
          removed: removed,
          added: unsaved
        });
      } catch (error) {}
    }
  };

  const handleAddAction = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      addUnsavedRows();
      searchParams.set('scrollToBottom', 'true');
      setSearchParams(searchParams);
    }
  };

  const handleRemoveAction = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      updateRemovedRows();
    }
  };

  const handleDiscardChanges = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      restoreEditedRows().then();
      discardUnsavedRows();
      deleteRemovedRowsByTabId(selectedTab.id);
      clearSelectedRows();
    }
  };

  const handleRefresh = async (): Promise<void> => {
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
