import { runQuery, runRawQuery } from '@/api/query';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { TabType } from '@/types';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataQuerySlice, DataRowSlice, DataStore } from '../types';

export const createDataQuerySlice: StateCreator<
  DataStore & DataQuerySlice & DataColumnSlice & DataRowSlice,
  [],
  [],
  DataQuerySlice
> = (set, get) => ({
  loading: false,
  toggleDataFetching: true,
  runQuery: async (tab: TabType): Promise<void> => {
    const currentConnection = useConnectionStore.getState().connections?.find((c) => c.isActive);
    if (!currentConnection) return;

    const filters = tab.filters ?? [];
    const sorts = tab.sorts ?? [];

    try {
      set({ loading: true });
      const res = await runQuery({
        connectionId: currentConnection.id,
        nodeId: tab.nodeId,
        limit: tab.pagination?.limit ?? 100,
        page: tab.pagination?.page ?? 1,
        columns: tab.columns ?? [],
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

      useTabStore.getState().updateQuery(tab, res.query);
      await Promise.all([get().updateRows(tab, res.data), get().updateColumns(tab, res.columns)]);
      set({ toggleDataFetching: !get().toggleDataFetching });
    } catch (error) {
      console.log('🚀 ~ runQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  },
  runRawQuery: async (tab: TabType | undefined): Promise<void> => {
    const currentConnection = useConnectionStore.getState().connections?.find((c) => c.isActive);
    if (!currentConnection || !tab) return;

    try {
      set({ loading: true });
      const res = await runRawQuery({
        connectionId: currentConnection.id,
        query: useTabStore.getState().getQuery(tab)
      });

      useTabStore.getState().updateQuery(tab, res.query);

      await Promise.all([get().updateRows(tab, res.data), get().updateColumns(tab, res.columns)]);
      set({ toggleDataFetching: !get().toggleDataFetching });
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.message);
      }
      console.log('🚀 ~ runRawQuery: ~ error:', error);
    } finally {
      set({ loading: false });
    }
  }
});
