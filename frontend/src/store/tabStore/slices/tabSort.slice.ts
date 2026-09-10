import type { DataTabType, SortType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabSortSlice, TabStore } from '../types';

export const createTabSortSlice: StateCreator<TabStore & TabSortSlice, [], [], TabSortSlice> = (_, get) => ({
  upsertSorts: (sort: SortType): void => {
    const tab = get().selectedTab<DataTabType>();
    if (!tab) return;

    const sorts = tab.sorts ?? [];
    const existing = sorts.findIndex((s: SortType) => s.index === sort.index);
    const nextSorts =
      existing === -1 ? [...sorts, sort] : sorts.map((s, i) => (i === existing ? { ...s, ...sort } : s));

    get().updateSelectedTab({ ...tab, sorts: nextSorts });
  },
  removeSort: (sort: SortType): void => {
    const tab = get().selectedTab<DataTabType>();
    if (!tab) return;

    get().updateSelectedTab({
      ...tab,
      sorts: (tab.sorts ?? []).filter((s: SortType) => s.index !== sort.index)
    });
  },
  updateSorts: (sorts: SortType[]): void => {
    const tab = get().selectedTab<DataTabType>();
    if (!tab) return;

    get().updateSelectedTab({ ...tab, sorts });
  }
});
