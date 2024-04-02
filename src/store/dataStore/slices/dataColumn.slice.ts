import { formatServerColumns, handelColumnChangeLog } from '@/src/core/utils';
import { ColumnType, EditedColumnType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataStore } from '../types';

export const createDataColumnSlice: StateCreator<DataStore & DataColumnSlice, [], [], DataColumnSlice> = (
  set,
  get
) => ({
  columns: {},
  editedColumns: {},
  getColumns: (withSelect: boolean) => {
    const selectedTab = useTabStore.getState().selectedTab;
    const columns = get().columns;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(columns, selectedTab.id)) {
      return [];
    }
    if (withSelect) return columns[selectedTab.id];
    return columns[selectedTab.id].filter((c: ColumnType) => c.key != 'select-row');
  },
  updateColumns: async (items: ColumnType[]) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const columns = get().columns;
    columns[selectedTab.id] = formatServerColumns(items);

    set({ columns });
  },
  updateColumn: async (column: ColumnType) => {
    const columns = get()
      .getColumns()
      .map((c) => {
        if (c.key == column.key) {
          return column;
        }
        return c;
      });

    get().updateColumns(columns);
  },
  getEditedColumns: () => {
    const selectedTab = useTabStore.getState().selectedTab;
    const columns = get().editedColumns;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(columns, selectedTab.id)) {
      return [];
    }
    return columns[selectedTab.id];
  },
  updateEditedColumns: async (oldValue: ColumnType, newValue: ColumnType | EditedColumnType) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const columns = get().editedColumns;
    columns[selectedTab.id] = handelColumnChangeLog(get().getEditedColumns(), oldValue, newValue);

    set({ editedColumns: columns });
  },
  updateRemovedColumns: async () => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    //if selected column edited before, we discard changes and add to removed list
    const editedColumns = get().getEditedColumns();
    const columns = get()
      .getColumns()
      .map((c: ColumnType) => {
        if (!c.selected) {
          return c;
        }

        const findValueIndex = editedColumns.findIndex((x) => x.key == c.key);
        if (findValueIndex === -1) {
          editedColumns.push({
            ...c,
            deleted: true
          });
        } else {
          c = {
            ...c,
            ...editedColumns[findValueIndex].old
          };
          editedColumns[findValueIndex] = {
            ...editedColumns[findValueIndex],
            ...editedColumns[findValueIndex].old,
            edited: false,
            old: undefined,
            new: undefined,
            deleted: true,
            editMode: undefined
          };
        }
        c.selected = false;
        c.editMode = undefined;
        return c;
      });

    const newEditedColumns = get().editedColumns;
    newEditedColumns[selectedTab.id] = editedColumns;
    set({ editedColumns: newEditedColumns });
    get().updateColumns(columns);
  },
  restoreEditedColumns: async () => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const editedColumns = get().getEditedColumns();
    const columns = get()
      .getColumns()
      .map((c) => {
        return {
          ...c,
          selected: false,
          editMode: undefined
        };
      });

    editedColumns.forEach((c: EditedColumnType) => {
      const findValueIndex = columns.findIndex((x) => x.key == c.key);
      columns[findValueIndex] = {
        ...columns[findValueIndex],
        ...c.old
      };
    });

    get().updateColumns(columns);

    const newEditedColumns = get().editedColumns;
    newEditedColumns[selectedTab.id] = [];
    set({ editedColumns: newEditedColumns });
  }
});
