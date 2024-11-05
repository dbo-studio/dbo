import { updateDesign } from '@/api/design';
import type { UpdateDesignItemType } from '@/api/design/types';
import { runQuery, runRawQuery } from '@/api/query';
import { cleanupUpdateDesignObject } from '@/core/utils';
import type { StateCreator } from 'zustand';
import { useConnectionStore } from '../../connectionStore/connection.store';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataEditedColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataEditedColumnSlice & DataRowSlice,
  [],
  [],
  DataQuerySlice
> = (set, get) => ({
  loading: false,
  runQuery: async () => {
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab || !currentConnection) {
      return;
    }

    const filters = selectedTab.filters ?? [];
    const sorts = selectedTab.sorts ?? [];

    try {
      set({ loading: true });
      const res = await runQuery({
        connection_id: currentConnection.id,
        table: selectedTab.table,
        schema: currentConnection.currentSchema ?? '',
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
      Promise.all([get().updateRows(res.data), get().updateColumns(res.structures)]);
    } catch (error) {
      // @ts-ignore
      throw new Error(error?.response?.data?.message);
    } finally {
      set({ loading: false });
    }
  },
  runRawQuery: async () => {
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab || !currentConnection) {
      return;
    }

    try {
      set({ loading: true });
      const res = await runRawQuery({
        connection_id: currentConnection.id,
        query: useTabStore.getState().getQuery()
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
    const currentConnection = useConnectionStore.getState().currentConnection;
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab || !currentConnection) {
      return;
    }

    const columns = get().getEditedColumns();
    if (columns.length === 0) {
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
      set({ loading: true });
      const res = await updateDesign({
        connection_id: currentConnection.id,
        table: selectedTab.table,
        schema: currentConnection.currentSchema ?? '',
        database: currentConnection.currentDatabase ?? '',
        edited: edited as UpdateDesignItemType[],
        removed: Array.from(removed),
        added: added as UpdateDesignItemType[]
      });

      useTabStore.getState().updateQuery(res.query);
      await Promise.all([get().updateEditedColumns([])]);
    } catch (error) {
      // @ts-ignore
      throw new Error(error?.response?.data?.message);
    } finally {
      set({ loading: false });
    }
  }
});
