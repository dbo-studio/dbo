import type { EditedRow, RowType } from '@/types';
import { pullAt } from 'lodash';
import type { StateCreator } from 'zustand';
import type { DataEditedRowsSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataEditedRowsSlice: StateCreator<
  DataStore & DataEditedRowsSlice & DataRowSlice & DataUnsavedRowsSlice,
  [],
  [],
  DataEditedRowsSlice
> = (set, get) => ({
  editedRows: [],
  updateEditedRows: (editedRows: EditedRow[]): void => {
    const unSavedRows = get().unSavedRows;
    const shouldBeUnsaved: RowType[] = [];

    editedRows.forEach((editedRow: EditedRow, index: number) => {
      const findValueIndex = unSavedRows.findIndex((x) => x.dbo_index === editedRow.dboIndex);
      if (findValueIndex > -1) {
        shouldBeUnsaved.push(...pullAt(editedRows, [index]));
      }
    });

    //  if row exists in unsaved'rows, it should not push into edited'rows list
    for (const unSavedRow of shouldBeUnsaved) {
      const { dboIndex, ...data } = unSavedRow;
      const newUnsavedRow = {
        ...data.new,
        dbo_index: dboIndex
      };
      get().addUnsavedRows(newUnsavedRow);
    }

    set({ editedRows: editedRows });
  },
  restoreEditedRows: async (): Promise<void> => {
    const newRows = get().editedRows;
    const oldRows = get().rows ?? [];

    for (const newRow of newRows) {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index === newRow.dboIndex);
      oldRows[findValueIndex] = {
        ...oldRows[findValueIndex],
        ...newRow.old
      };
    }

    await get().updateRows(oldRows);
    get().updateEditedRows([]);
  }
});
