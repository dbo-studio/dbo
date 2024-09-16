import { createEmptyColumn, handelColumnChangeLog } from '@/core/utils';
import type { ColumnType, EditedColumnType } from '@/types';
import { pullAt } from 'lodash';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataEditedColumnSlice, DataStore } from '../types';

export const createDataEditedColumnSlice: StateCreator<
  DataStore & DataEditedColumnSlice & DataColumnSlice,
  [],
  [],
  DataEditedColumnSlice
> = (set, get) => ({
  editedColumns: {},
  getEditedColumns: () => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    const columns = get().editedColumns;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(columns, selectedTab.id)) {
      return [];
    }
    return columns[selectedTab.id];
  },
  updateEditedColumns: async (columns: EditedColumnType[]) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }
    const editedColumns = get().editedColumns;
    editedColumns[selectedTab.id] = columns;

    set({ editedColumns });
  },
  addEditedColumns: async (oldValue: ColumnType, newValue: ColumnType | EditedColumnType) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const editedColumns = handelColumnChangeLog(get().getEditedColumns(), oldValue, newValue);
    get().updateEditedColumns(editedColumns);
  },
  updateRemovedColumns: async () => {
    const shouldRemoveUnsaved: number[] = [];
    //if selected column edited before, we discard changes and add to removed list
    const editedColumns = get().getEditedColumns();
    const columns = get()
      .getColumns()
      .map((c: ColumnType, index) => {
        if (!c.selected) {
          return c;
        }

        const findValueIndex = editedColumns.findIndex((x) => x.key === c.key);
        if (findValueIndex === -1) {
          editedColumns.push({
            ...c,
            deleted: true
          });
        } else {
          if (editedColumns[findValueIndex].unsaved) {
            pullAt(editedColumns, [findValueIndex]);
            shouldRemoveUnsaved.push(index);
          } else {
            // biome-ignore lint: reason
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
        }
        c.selected = false;
        c.editMode = undefined;
        return c;
      });

    get().updateEditedColumns(editedColumns);
    get().updateColumns(columns.filter((_, index) => !shouldRemoveUnsaved.includes(index)));
  },
  restoreEditedColumns: async () => {
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

    for (const c of editedColumns) {
      const findValueIndex = columns.findIndex((x) => x.key === c.key);
      if (c.unsaved) {
        pullAt(columns, [findValueIndex]);
      } else {
        columns[findValueIndex] = {
          ...columns[findValueIndex],
          ...c.old
        };
      }
    }

    get().updateColumns(columns);
    get().updateEditedColumns([]);
  },
  addEmptyEditedColumns: async () => {
    const editedColumns = get().getEditedColumns();
    const columns = get().getColumns();

    if (editedColumns.filter((c) => c.unsaved).length > 0) {
      return;
    }

    const newColumn = createEmptyColumn();

    columns.push(newColumn);
    (newColumn as EditedColumnType).unsaved = true;
    (newColumn as EditedColumnType).editMode = {
      comment: true,
      default: true,
      length: true,
      name: true
    };
    editedColumns.push(newColumn);

    get().updateColumns(columns);
    get().updateEditedColumns(editedColumns);
  },
  removeEditedColumnsByTabId: (tabId: string) => {
    const columns = get().editedColumns;
    if (Object.prototype.hasOwnProperty.call(columns, tabId)) {
      delete columns[tabId];
    }

    set({ editedColumns: columns });
  }
});
