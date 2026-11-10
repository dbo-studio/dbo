import { debouncedSaveColumns } from '@/core/utils/indexedDbHelper';
import { selectPaneSelectedTabId } from '@/store/tabStore/tab.store';
import type { ColumnType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataStore } from '../types';

export const createDataColumnSlice: StateCreator<
  DataStore & DataColumnSlice,
  [['zustand/devtools', never]],
  [],
  DataColumnSlice
> = (set, get) => ({
  columns: undefined,
  getActiveColumns: (): ColumnType[] => {
    return get().columns?.filter((c) => c.isActive) ?? [];
  },
  updateColumns: async (columns: ColumnType[]): Promise<void> => {
    const selectedTabId = selectPaneSelectedTabId(get().paneId);
    if (!selectedTabId) return;

    set({ columns }, undefined, 'updateColumns');
    await debouncedSaveColumns(selectedTabId, columns);

    return Promise.resolve();
  }
});
