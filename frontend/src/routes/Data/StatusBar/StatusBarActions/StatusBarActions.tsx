import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useDataGridRowActions } from '@/components/common/DataGrid/hooks/useDataGridRowActions';
import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { buildRowConditions, mapRowValuesToPhysical, shortcuts } from '@/core/utils';
import { resolveSafeModeGate } from '@/core/utils/safeModeGate';
import { useCurrentConnection, useShortcut } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useLayoutMode } from '@/hooks/useLayoutMode.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import type { EditedRow, RowType } from '@/types';
import { IconButton, Tooltip } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useCallback, type JSX } from 'react';
import { toast } from 'sonner';
import { StatusBarActionsStackStyled } from './StatusBarActions.styled';

const chordLabel = (label: string, command: string[]): string => `${label} (${command.join('+')})`;

export default function StatusBarActions(): JSX.Element {
  const { isMobile } = useLayoutMode();
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const updatableNodeId = useDataStore((state) => state.updatableNodeId);

  const { canEditGrid, isDataFetching, addRow, removeSelectedRows, discardChanges, refresh, refreshOrStop } =
    useDataGridRowActions();

  const { mutateAsync: updateQueryMutation, isPending: updateQueryPending } = useMutation({
    mutationFn: api.query.updateQuery
  });

  const handleSave = useCallback(async (): Promise<void> => {
    const [removedRows, unsavedRows, columns] = await Promise.all([
      indexedDBService.getRemovedRows(selectedTab?.id ?? ''),
      indexedDBService.getUnsavedRows(selectedTab?.id ?? ''),
      indexedDBService.getColumns(selectedTab?.id ?? '')
    ]);

    const editedRows = await indexedDBService.getEditedRows(selectedTab?.id ?? '');
    const nodeId =
      selectedTab?.mode === TabMode.Data
        ? selectedTab.nodeId
        : selectedTab?.mode === TabMode.Query
          ? updatableNodeId
          : undefined;

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

      const payload = {
        connectionId: currentConnection.id,
        nodeId,
        edited: mappedEdited,
        removed: mappedRemoved,
        added: mappedAdded
      };

      try {
        const res = await updateQueryMutation(payload);
        await refresh();
        toast.success(`${locales.changes_saved_successfully}. ${locales.row_affected}: ${res.rowAffected}`);
      } catch (error) {
        const shouldRetry = await resolveSafeModeGate(error);
        if (!shouldRetry) {
          return;
        }
        const res = await updateQueryMutation({ ...payload, confirmed: true });
        await refresh();
        toast.success(`${locales.changes_saved_successfully}. ${locales.row_affected}: ${res.rowAffected}`);
      }
    } catch (error) {
      console.debug('🚀 ~ handleSave ~ error:', error);
      toast.error(locales.save_failed);
    }
  }, [canEditGrid, selectedTab, currentConnection, updateQueryMutation, refresh, updatableNodeId]);

  const editDisabled = updateQueryPending || isDataFetching;

  useShortcut(shortcuts.saveGrid, () => {
    if (canEditGrid && !editDisabled) {
      void handleSave();
    }
  });
  useShortcut(shortcuts.addRow, () => {
    if (canEditGrid && !editDisabled) {
      void addRow();
    }
  });
  useShortcut(shortcuts.discardChanges, () => {
    if (canEditGrid && !editDisabled) {
      void discardChanges();
    }
  });

  return (
    <StatusBarActionsStackStyled mobile={isMobile}>
      {canEditGrid && (
        <>
          <Tooltip title={chordLabel(locales.add_row, shortcuts.addRow.command)}>
            <span>
              <IconButton aria-label={locales.add_row} disabled={editDisabled} onClick={() => void addRow()}>
                <CustomIcon type='plus' size='s' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={locales.remove_row}>
            <span>
              <IconButton
                aria-label={locales.remove_row}
                disabled={editDisabled}
                onClick={() => void removeSelectedRows()}
              >
                <CustomIcon type='mines' size='s' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={chordLabel(locales.save, shortcuts.saveGrid.command)}>
            <span>
              <IconButton
                aria-label={locales.save}
                data-testid='grid-save'
                disabled={editDisabled}
                onClick={() => void handleSave()}
              >
                <CustomIcon type='check' size='s' />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={chordLabel(locales.discard_changes, shortcuts.discardChanges.command)}>
            <span>
              <IconButton
                aria-label={locales.discard_changes}
                disabled={editDisabled}
                onClick={() => void discardChanges()}
              >
                <CustomIcon type='close' size='s' />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}

      <Tooltip
        title={
          isDataFetching
            ? chordLabel(locales.stop_query, shortcuts.cancelQuery.command)
            : chordLabel(locales.refresh, shortcuts.reloadTab.command)
        }
      >
        <span>
          <IconButton
            aria-label={isDataFetching ? locales.stop_query : locales.refresh}
            data-testid={isDataFetching ? 'stop-query' : 'refresh-query'}
            color={isDataFetching ? 'error' : 'default'}
            disabled={updateQueryPending}
            onClick={refreshOrStop}
          >
            <CustomIcon type={isDataFetching ? 'stop' : 'refresh'} size='s' />
          </IconButton>
        </span>
      </Tooltip>
    </StatusBarActionsStackStyled>
  );
}
