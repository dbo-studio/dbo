import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { buildRowConditions, createEmptyRow, mapRowValuesToPhysical } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { DataTabType, EditedRow, RowType } from '@/types';
import { IconButton, Tooltip } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { StatusBarActionsStackStyled } from './StatusBarActions.styled';

export default function StatusBarActions(): JSX.Element {
  const { isMobile } = useLayoutMode();
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const gridEditable = useDataStore((state) => state.gridEditable);
  const updatableNodeId = useDataStore((state) => state.updatableNodeId);

  const updateEditor = useSettingStore((state) => state.updateEditor);
  const addUnsavedRows = useDataStore((state) => state.addUnsavedRows);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);
  const updateRows = useDataStore((state) => state.updateRows);
  const updateRemovedRows = useDataStore((state) => state.updateRemovedRows);
  const restoreEditedRows = useDataStore((state) => state.restoreEditedRows);
  const updateUnsavedRows = useDataStore((state) => state.updateUnsavedRows);
  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);

  const { mutateAsync: updateQueryMutation, isPending: updateQueryPending } = useMutation({
    mutationFn: api.query.updateQuery
  });

  const canEditGrid =
    selectedTab?.mode === TabMode.Data
      ? (selectedTab as DataTabType).editable
      : selectedTab?.mode === TabMode.Query && gridEditable && !!updatableNodeId;

  const resolveNodeId = (): string | undefined => {
    if (selectedTab?.mode === TabMode.Data) {
      return selectedTab.nodeId;
    }
    if (selectedTab?.mode === TabMode.Query) {
      return updatableNodeId;
    }
    return undefined;
  };

  const handleSave = async (): Promise<void> => {
    const [removedRows, unsavedRows, columns] = await Promise.all([
      indexedDBService.getRemovedRows(selectedTab?.id ?? ''),
      indexedDBService.getUnsavedRows(selectedTab?.id ?? ''),
      indexedDBService.getColumns(selectedTab?.id ?? '')
    ]);

    const editedRows = await indexedDBService.getEditedRows(selectedTab?.id ?? '');
    const nodeId = resolveNodeId();

    if (!canEditGrid || !selectedTab || !currentConnection || !nodeId) {
      return;
    }

    if (editedRows.length === 0 && removedRows.length === 0 && unsavedRows.length === 0) {
      return;
    }

    try {
      const mappedEdited: EditedRow[] = editedRows.map((edited) => ({
        ...edited,
        new: mapRowValuesToPhysical(edited.new, columns) as RowType
      }));
      const mappedRemoved = removedRows.map((row) => buildRowConditions(row, columns) as RowType);
      const mappedAdded = unsavedRows.map((row) => mapRowValuesToPhysical(row, columns) as RowType);

      const res = await updateQueryMutation({
        connectionId: currentConnection.id,
        nodeId,
        edited: mappedEdited,
        removed: mappedRemoved,
        added: mappedAdded
      });
      await handleRefresh();

      toast.success(`${locales.changes_saved_successfully}. ${locales.row_affected}: ${res.rowAffected}`);
    } catch (error) {
      console.debug('🚀 ~ handleSave ~ error:', error);
      toast.error(locales.save_failed);
    }
  };

  const handleAddAction = async (): Promise<void> => {
    if (!canEditGrid || !selectedTab) {
      return;
    }

    const columns = await indexedDBService.getColumns(selectedTab.id);
    const rows = await indexedDBService.getRows(selectedTab.id);
    const activeColumns = (columns ?? []).filter((column) => column.isActive !== false);
    const canInsertRows =
      selectedTab.mode !== TabMode.Query || activeColumns.every((column) => column.editable !== false);

    if (!canInsertRows) {
      return;
    }

    const emptyRow = createEmptyRow(activeColumns);
    emptyRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;

    rows.push(emptyRow);

    await updateRows(rows);
    addUnsavedRows(emptyRow);

    updateEditor({ scrollToBottom: true });
  };

  const handleRemoveAction = async (): Promise<void> => {
    if (!canEditGrid) {
      return;
    }

    await updateRemovedRows(undefined);
  };

  const handleDiscardChanges = async (): Promise<void> => {
    if (!canEditGrid || !selectedTab) {
      return;
    }

    const rows = await indexedDBService.getRows(selectedTab.id);
    const unsavedRows = await indexedDBService.getUnsavedRows(selectedTab.id);

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
    if (!selectedTab) {
      return;
    }

    if (selectedTab.mode === TabMode.Query) {
      await handleDiscardChanges();
      await runRawQuery();
      return;
    }

    await handleDiscardChanges();
    toggleReRunQuery();
  };

  if (!canEditGrid) {
    return <></>;
  }

  const disabled = updateQueryPending || isDataFetching;

  return (
    <StatusBarActionsStackStyled mobile={isMobile}>
      <Tooltip title={locales.add_row}>
        <IconButton aria-label={locales.add_row} disabled={disabled} onClick={() => void handleAddAction()}>
          <CustomIcon type='plus' size='s' />
        </IconButton>
      </Tooltip>

      <Tooltip title={locales.remove_row}>
        <IconButton aria-label={locales.remove_row} disabled={disabled} onClick={() => void handleRemoveAction()}>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Tooltip>

      <Tooltip title={locales.save}>
        <IconButton
          aria-label={locales.save}
          data-testid='grid-save'
          disabled={disabled}
          onClick={() => void handleSave()}
        >
          <CustomIcon type='check' size='s' />
        </IconButton>
      </Tooltip>

      <Tooltip title={locales.discard_changes}>
        <IconButton
          aria-label={locales.discard_changes}
          disabled={disabled}
          onClick={() => void handleDiscardChanges()}
        >
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Tooltip>

      <Tooltip title={locales.refresh}>
        <IconButton
          aria-label={locales.refresh}
          loading={isDataFetching}
          disabled={disabled}
          onClick={() => void handleRefresh()}
        >
          <CustomIcon type='refresh' size='s' />
        </IconButton>
      </Tooltip>
    </StatusBarActionsStackStyled>
  );
}
