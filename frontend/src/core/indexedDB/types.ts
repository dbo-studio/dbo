import type { SelectedRow } from '@/store/dataStore/types';
import type { ColumnType, EditedRow, RowType } from '@/types';
import type { DBSchema } from 'idb';

export interface TableDataDB extends DBSchema {
  rows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: RowType;
    };
    indexes: { 'by-tab': string };
  };
  columns: {
    key: string; // tabId
    value: {
      tabId: string;
      columns: ColumnType[];
    };
  };
  editedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: EditedRow;
    };
    indexes: { 'by-tab': string };
  };
  removedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: RowType;
    };
    indexes: { 'by-tab': string };
  };
  unsavedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: RowType;
    };
    indexes: { 'by-tab': string };
  };
  selectedRows: {
    key: string; // tabId + rowIndex
    value: {
      tabId: string;
      rowIndex: number;
      data: SelectedRow;
    };
    indexes: { 'by-tab': string };
  };
}
