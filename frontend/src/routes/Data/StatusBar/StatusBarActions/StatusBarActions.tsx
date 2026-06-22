import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { createEmptyRow } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, IconButton } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { StatusBarActionsStackStyled } from './StatusBarActions.styled';

export default function StatusBarActions(): JSX.Element {
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();

  const updateEditor = useSettingStore((state) => state.updateEditor);
  const addUnsavedRows = useDataStore((state) => state.addUnsavedRows);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const updateRows = useDataStore((state) => state.updateRows);
  const updateRemovedRows = useDataStore((state) => state.updateRemovedRows);
  const restoreEditedRows = useDataStore((state) => state.restoreEditedRows);
  const updateUnsavedRows = useDataStore((state) => state.updateUnsavedRows);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);

  const { mutateAsync: updateQueryMutation, isPending: updateQueryPending } = useMutation({
    mutationFn: api.query.updateQuery
  });

  const handleSave = async (): Promise<void> => {
    const [removedRows, unsavedRows] = await Promise.all([
      indexedDBService.getRemovedRows(selectedTab?.id ?? ''),
      indexedDBService.getUnsavedRows(selectedTab?.id ?? '')
    ]);

    const editedRows = await indexedDBService.getEditedRows(selectedTab?.id ?? '');

    if (selectedTab?.mode === TabMode.Data) {
      if (
        !selectedTab ||
        !currentConnection ||
        (editedRows.length === 0 && removedRows.length === 0 && unsavedRows.length === 0)
      ) {
        return;
      }

      try {
        const res = await updateQueryMutation({
          connectionId: currentConnection.id,
          nodeId: selectedTab.nodeId,
          edited: editedRows,
          removed: removedRows,
          added: unsavedRows
        });
        await handleRefresh();

        toast.success(`${locales.changes_saved_successfully}. ${locales.row_affected}: ${res.rowAffected}`);
      } catch (error) {
        console.debug('🚀 ~ handleSave ~ error:', error);
      }
    }
  };

  const handleAddAction = async (): Promise<void> => {
    if (selectedTab?.mode !== TabMode.Data) {
      return;
    }

    const columns = await indexedDBService.getColumns(selectedTab?.id ?? '');
    const rows = await indexedDBService.getRows(selectedTab?.id ?? '');

    const emptyRow = createEmptyRow(columns ?? []);
    emptyRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;

    rows.push(emptyRow);

    await updateRows(rows);
    addUnsavedRows(emptyRow);

    updateEditor({ scrollToBottom: true });
  };

  const handleRemoveAction = async (): Promise<void> => {
    await updateRemovedRows(undefined);
  };

  const handleDiscardChanges = async (): Promise<void> => {
    if (selectedTab?.mode !== TabMode.Data) {
      return;
    }

    const rows = await indexedDBService.getRows(selectedTab?.id ?? '');
    const unsavedRows = await indexedDBService.getUnsavedRows(selectedTab?.id ?? '');

    await updateUnsavedRows([]);

    if (unsavedRows.length > 0) {
      const unsavedIndexes = new Set(unsavedRows.map((row) => row.dbo_index));
      const updatedRows = rows && rows.length > 0 ? rows.filter((row) => !unsavedIndexes.has(row.dbo_index)) : [];
      await updateRows(updatedRows);
    }

    await Promise.all([updateRemovedRows([]), restoreEditedRows()]);

    updateSelectedRows([], true);
  };

  const handleRefresh = async (): Promise<void> => {
    await handleDiscardChanges();
    toggleReRunQuery();
  };

  return (
    <StatusBarActionsStackStyled direction={'row'}>
      <Box>
        <IconButton disabled={updateQueryPending || isDataFetching} onClick={() => void handleAddAction()}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton disabled={updateQueryPending || isDataFetching} onClick={() => void handleRemoveAction()}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box
        sx={{
          ml: 1,
          mr: 1
        }}
      >
        <IconButton onClick={() => void handleSave()}>
          <CustomIcon type='check' size='s' />
        </IconButton>
        <IconButton onClick={() => void handleDiscardChanges()} disabled={updateQueryPending || isDataFetching}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <IconButton
          loading={isDataFetching}
          disabled={updateQueryPending || isDataFetching}
          onClick={() => void handleRefresh()}
        >
          <CustomIcon type='refresh' size='s' />
        </IconButton>

        {/* <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton> */}
      </Box>
    </StatusBarActionsStackStyled>
  );
}
