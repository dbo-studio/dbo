import { updateDesign } from '@/src/api/design';
import { UpdateDesignItemType } from '@/src/api/design/types';
import { runQuery, runRawQuery } from '@/src/api/query';
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
        columns: [],
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

    const added = columns
      .filter((c) => c.unsaved)
      .map((c) => {
        return {
          name: c.name,
          type: c.type,
          length: Number(c.length),
          default: {
            value: c.default
          },
          is_null: !c.notNull,
          comment: c.comment
        };
      });

    const edited = columns
      .filter((c) => !c.unsaved && c.edited)
      .map((c) => {
        return {
          name: c.name,
          type: c.type,
          length: Number(c.length),
          default: {
            value: c.default
          },
          is_null: !c.notNull,
          comment: c.comment
        };
      });

    try {
      const res = await updateDesign({
        connection_id: currentConnection.id,
        table: selectedTab.table,
        schema: currentConnection.currentSchema!,
        database: currentConnection.currentDatabase!,
        edited: [],
        removed: [],
        added: added as UpdateDesignItemType[]
      });

      useTabStore.getState().updateQuery(res.query);
      Promise.all([get().updateRows(res.data), get().updateColumns(res.structures)]);
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  }
});
