import api from '@/api';
import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { buildRowConditions, mapRowValuesToPhysical } from '@/core/utils';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import type { EditedRow, RowType } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useDataGridRowActions } from './useDataGridRowActions';

/**
 * Persists the grid's pending edits, removals and inserts for the selected tab, then refreshes it.
 * Shared by the desktop status bar and the mobile data view.
 */
export function useSaveGridChanges(): { save: () => Promise<void>; saving: boolean } {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const updatableNodeId = useDataStore((state) => state.updatableNodeId);
  const { canEditGrid, refresh } = useDataGridRowActions();

  const { mutateAsync: updateQueryMutation, isPending } = useMutation({
    mutationFn: api.query.updateQuery
  });

  const save = useCallback(async (): Promise<void> => {
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

      const res = await withSafeModeRetry((confirmed) => updateQueryMutation({ ...payload, confirmed }));
      if (res === undefined) {
        return;
      }

      await refresh();
      toast.success(`${locales.changes_saved_successfully}. ${locales.row_affected}: ${res.rowAffected}`);
    } catch {
      toast.error(locales.save_failed);
    }
  }, [canEditGrid, selectedTab, currentConnection, updateQueryMutation, refresh, updatableNodeId]);

  return { save, saving: isPending };
}
