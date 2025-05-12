import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton';
import { TabMode } from '@/core/enums';
import { createEmptyRow } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useTableData } from '@/contexts/TableData';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, IconButton, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';

export default function StatusBarActions(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const selectedTab = useSelectedTab();
  const { toggleScrollToBottom } = useSettingStore();
  const {
    isLoading,
    rows,
    columns,
    addUnsavedRow,
    unsavedRows,
    editedRows,
    removedRows,
    selectedRows,
    updateRows,
    updateEditedRows,
    updateRemovedRows,
    restoreEditedRows,
    updateUnsavedRows,
    runQuery,
    setSelectedRows,
    deleteRemovedRows
  } = useTableData();

  const { mutateAsync: updateQueryMutation, isPending: updateQueryPending } = useMutation({
    mutationFn: api.query.updateQuery,
    onSuccess: async (): Promise<void> => {
      if (!selectedTab) return;
      await runQuery();
      await updateEditedRows([]);
      await deleteRemovedRows();
      await updateUnsavedRows([]);
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ updateQueryMutation ~ error:', error);
    }
  });

  const handleSave = async (): Promise<void> => {
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
      } catch (error) {}
    }
  };

  const handleAddAction = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      // Create an empty row
      const filteredRow = createEmptyRow(columns);
      filteredRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;

      // Add the row to both rows and unsavedRows
      await updateRows([...rows, filteredRow]);
      await addUnsavedRow(filteredRow);

      toggleScrollToBottom(true);
    }
  };

  const handleRemoveAction = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      // Get the selected rows
      const selectedIndexes = new Set(selectedRows.map((row) => row.index));

      // Filter out unsaved rows
      const selectedUnsavedRows = unsavedRows.filter((r) => selectedIndexes.has(r.dbo_index));
      const unsavedIndexes = new Set(selectedUnsavedRows.map((r) => r.dbo_index));

      // Add the remaining selected rows to the removedRows array
      const rowsToRemove = rows
        .filter((r) => selectedIndexes.has(r.dbo_index) && !unsavedIndexes.has(r.dbo_index))
        .map((row) => (row.id ? { id: row.id, dbo_index: row.dbo_index } : row));

      // Update removed rows
      await updateRemovedRows(rowsToRemove);

      // Discard the unsaved rows that were selected
      if (selectedUnsavedRows.length > 0) {
        const updatedRows = rows.filter((row) => !selectedUnsavedRows.some((r) => r.dbo_index === row.dbo_index));
        await updateRows(updatedRows);
        await updateUnsavedRows(
          unsavedRows.filter((row) => !selectedUnsavedRows.some((r) => r.dbo_index === row.dbo_index))
        );
      }

      // Clear the selected rows
      await setSelectedRows([]);
    }
  };

  const handleDiscardChanges = async (): Promise<void> => {
    if (selectedTab?.mode === TabMode.Data) {
      await restoreEditedRows();
      await updateUnsavedRows([]);

      // Remove unsaved rows from the main rows array
      if (unsavedRows.length > 0) {
        const unsavedIndexes = new Set(unsavedRows.map((row) => row.dbo_index));
        const updatedRows = rows.filter((row) => !unsavedIndexes.has(row.dbo_index));
        await updateRows(updatedRows);
      }

      await deleteRemovedRows();
      await setSelectedRows([]);
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
        <IconButton disabled={updateQueryPending || isLoading} onClick={handleAddAction}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton disabled={updateQueryPending || isLoading} onClick={handleRemoveAction}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <LoadingIconButton onClick={handleSave}>
          <CustomIcon type='check' size='s' />
        </LoadingIconButton>
        <IconButton onClick={handleDiscardChanges} disabled={updateQueryPending || isLoading}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <LoadingIconButton loading={isLoading} disabled={updateQueryPending || isLoading} onClick={handleRefresh}>
          <CustomIcon type='refresh' size='s' />
        </LoadingIconButton>

        {/* <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton> */}
      </Box>
    </Stack>
  );
}
