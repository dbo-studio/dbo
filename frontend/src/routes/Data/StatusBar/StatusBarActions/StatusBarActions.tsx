import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton';
import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { createEmptyRow } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, IconButton, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';

export default function StatusBarActions(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab();
  const selectedRows = useDataStore((state) => state.selectedRows);
  const rows = useDataStore((state) => state.rows);
  const columns = useDataStore((state) => state.columns);
  const isDataFetching = useDataStore((state) => state.isDataFetching);

  const toggleScrollToBottom = useSettingStore((state) => state.toggleScrollToBottom);
  const addUnsavedRows = useDataStore((state) => state.addUnsavedRows);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const updateRows = useDataStore((state) => state.updateRows);
  const updateRemovedRows = useDataStore((state) => state.updateRemovedRows);
  const restoreEditedRows = useDataStore((state) => state.restoreEditedRows);
  const updateUnsavedRows = useDataStore((state) => state.updateUnsavedRows);
  const runQuery = useDataStore((state) => state.runQuery);

  const { mutateAsync: updateQueryMutation, isPending: updateQueryPending } = useMutation({
    mutationFn: api.query.updateQuery,
    onSuccess: async (): Promise<void> => {
      handleRefresh();
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ updateQueryMutation ~ error:', error);
    }
  });

  const handleSave = async (): Promise<void> => {
    const [removedRows, unsavedRows] = await Promise.all([
      indexedDBService.getRemovedRows(selectedTab?.nodeId ?? ''),
      indexedDBService.getUnsavedRows(selectedTab?.nodeId ?? '')
    ]);

    const editedRows = await indexedDBService.getEditedRows(selectedTab?.nodeId ?? '');

    if (selectedTab?.mode === TabMode.Data) {
      if (
        !selectedTab ||
        !currentConnection ||
        (editedRows.length === 0 && removedRows.length === 0 && unsavedRows.length === 0)
      ) {
        return;
      }

      try {
        await updateQueryMutation({
          connectionId: currentConnection.id,
          nodeId: selectedTab.nodeId,
          edited: editedRows,
          removed: removedRows,
          added: unsavedRows
        });
      } catch (error) {
        console.log(error);
      }
    }
  };

  const handleAddAction = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      const emptyRow = createEmptyRow(columns ?? []);
      emptyRow.dbo_index = 0;

      await updateRows([emptyRow, ...(rows ?? [])]);
      await addUnsavedRows(emptyRow);

      toggleScrollToBottom(true);
    }
  };

  const handleRemoveAction = async (): Promise<void> => {
    const unsavedRows = await indexedDBService.getUnsavedRows(selectedTab?.nodeId ?? '');

    if (selectedTab?.mode === TabMode.Data) {
      // Get the selected rows
      const selectedIndexes = new Set(selectedRows.map((row) => row.index));

      // Filter out unsaved rows
      const selectedUnsavedRows = unsavedRows.filter((r) => selectedIndexes.has(r.dbo_index));
      const unsavedIndexes = new Set(selectedUnsavedRows.map((r) => r.dbo_index));

      // Add the remaining selected rows to the removedRows array
      const rowsToRemove =
        rows && rows.length > 0
          ? rows
              .filter((r) => selectedIndexes.has(r.dbo_index) && !unsavedIndexes.has(r.dbo_index))
              .map((row) => (row.id ? { id: row.id, dbo_index: row.dbo_index } : row))
          : [];

      // Update removed rows
      await updateRemovedRows(rowsToRemove);

      // Discard the unsaved rows that were selected
      if (selectedUnsavedRows.length > 0) {
        const updatedRows =
          rows && rows.length > 0
            ? rows.filter((row) => !selectedUnsavedRows.some((r) => r.dbo_index === row.dbo_index))
            : [];
        await updateRows(updatedRows);
        await updateUnsavedRows(
          unsavedRows.filter((row) => !selectedUnsavedRows.some((r) => r.dbo_index === row.dbo_index))
        );
      }

      // Clear the selected rows
      await updateSelectedRows([]);
    }
  };

  const handleDiscardChanges = async (): Promise<void> => {
    const unsavedRows = await indexedDBService.getUnsavedRows(selectedTab?.nodeId ?? '');

    if (selectedTab?.mode === TabMode.Data) {
      await restoreEditedRows();

      await updateUnsavedRows([]);

      if (unsavedRows.length > 0) {
        const unsavedIndexes = new Set(unsavedRows.map((row) => row.dbo_index));
        const updatedRows = rows && rows.length > 0 ? rows.filter((row) => !unsavedIndexes.has(row.dbo_index)) : [];
        await updateRows(updatedRows);
      }

      await updateRemovedRows([]);

      await updateSelectedRows([]);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    if (!selectedTab) return;

    await handleDiscardChanges();
    await runQuery();
  };

  return (
    <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} width={208}>
      <Box>
        <IconButton disabled={updateQueryPending || isDataFetching} onClick={handleAddAction}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton disabled={updateQueryPending || isDataFetching} onClick={handleRemoveAction}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <LoadingIconButton onClick={handleSave}>
          <CustomIcon type='check' size='s' />
        </LoadingIconButton>
        <IconButton onClick={handleDiscardChanges} disabled={updateQueryPending || isDataFetching}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <LoadingIconButton
          loading={isDataFetching}
          disabled={updateQueryPending || isDataFetching}
          onClick={handleRefresh}
        >
          <CustomIcon type='refresh' size='s' />
        </LoadingIconButton>

        {/* <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton> */}
      </Box>
    </Stack>
  );
}
