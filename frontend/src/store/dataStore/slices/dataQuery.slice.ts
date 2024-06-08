import { updateDesign } from '@/src/api/design';
import { UpdateDesignItemType } from '@/src/api/design/types';
import { runQuery, runRawQuery } from '@/src/api/query';
import { cleanupUpdateDesignObject } from '@/src/core/utils';
import { StateCreator } from 'zustand';
import { useConnectionStore } from '../../connectionStore/connection.store';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataRowSlice,
  [],
  [],
  DataQuerySlice
> = (set, get) => ({
  loading: false,
  runQuery: async () => {
    set({ loading: true });
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab || !currentConnection) {
      return;
    }

    const filters = selectedTab.filters ?? [];
    const sorts = selectedTab.sorts ?? [];

    try {
      const res = await runQuery({
        connection_id: currentConnection.id,
        table: selectedTab.table,
        schema: currentConnection.currentSchema!,
        limit: selectedTab.pagination.limit,
        offset: (selectedTab.pagination.page - 1) * selectedTab.pagination.limit,
        columns: selectedTab.columns ?? [],
        filters: filters.filter(
          (f) =>
            f.column.length > 0 &&
            f.operator.length > 0 &&
            f.value.toString().length > 0 &&
            f.next.length > 0 &&
            f.isActive
        ),
        sorts: sorts.filter((f) => f.column.length > 0 && f.operator.length > 0 && f.isActive)
      });

      useTabStore.getState().updateQuery(res.query);
      await Promise.all([get().updateRows(res.data), get().updateColumns(res.structures)]);
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  },
  runRawQuery: async () => {
    set({ loading: true });
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab || !currentConnection) {
      return;
    }

    try {
      const res = await runRawQuery({
        connection_id: currentConnection.id,
        query: selectedTab.query
      });

      useTabStore.getState().updateQuery(res.query);
      Promise.all([get().updateRows(res.data), get().updateColumns(res.structures)]);
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  },
  updateDesignsQuery: async () => {
    set({ loading: true });
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab || !currentConnection) {
      return;
    }

    const columns = get().getEditedColumns();

    if (columns.length == 0) {
      set({ loading: false });
      return;
    }

    const added = columns
      .filter((c) => c.unsaved)
      .map((c) => {
        return cleanupUpdateDesignObject(c?.new ?? null);
      });

    const edited = columns
      .filter((c) => !c.unsaved && c.edited)
      .map((c) => {
        const data = cleanupUpdateDesignObject(c?.new ?? null);
        if (c?.old?.name !== c?.new?.name) {
          data.rename = c?.new?.name;
          data.name = c?.old?.name;
        } else {
          data.name = c.name;
        }

        return data;
      });

    const removed = columns
      .filter((c) => c.deleted)
      .map((c) => {
        return c.name;
      });

    try {
      const res = await updateDesign({
        connection_id: currentConnection.id,
        table: selectedTab.table,
        schema: currentConnection.currentSchema!,
        database: currentConnection.currentDatabase!,
        edited: edited as UpdateDesignItemType[],
        removed: Array.from(removed),
        added: added as UpdateDesignItemType[]
      });

      useTabStore.getState().updateQuery(res.query);
      Promise.all([get().updateEditedColumns([])]);
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  }
});
