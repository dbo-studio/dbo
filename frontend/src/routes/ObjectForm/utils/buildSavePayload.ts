import type { FormObjectData } from '@/store/formObject/types';
import { ObjectTabType } from '@/types';
import { FormFieldType, FormValue, GeneralFieldType } from '@/types/Tree';

const ARRAY_TAB_IDS = new Set(['table_columns', 'table_keys', 'table_foreign_keys']);

const TABLE_ACTIONS = new Set(['createTable', 'editTable']);
const VIEW_ACTIONS = new Set(['createView', 'editView']);

type ColumnChange = {
  new: Record<string, FormValue>;
  old: Record<string, FormValue>;
  added?: boolean;
  deleted?: boolean;
};

const MYSQL_TABLE_FIELD_MAP: Record<string, string> = {
  TABLE_NAME: 'relname',
  TABLE_COMMENT: 'description'
};

const MYSQL_COLUMN_FIELD_MAP: Record<string, string> = {
  COLUMN_NAME: 'column_name',
  DATA_TYPE: 'data_type',
  IS_NULLABLE: 'not_null',
  COLUMN_DEFAULT: 'column_default',
  COLUMN_COMMENT: 'comment',
  CHARACTER_MAXIMUM_LENGTH: 'character_maximum_length',
  NUMERIC_SCALE: 'numeric_scale',
  AUTO_INCREMENT: 'is_identity'
};

const mapFieldId = (tabId: string, fieldId: string): string => {
  if (tabId === 'table_foreign_keys' && fieldId === 'constraint_name') {
    return 'name';
  }

  if (tabId === 'table' && MYSQL_TABLE_FIELD_MAP[fieldId]) {
    return MYSQL_TABLE_FIELD_MAP[fieldId];
  }

  if (tabId === 'table_columns' && MYSQL_COLUMN_FIELD_MAP[fieldId]) {
    return MYSQL_COLUMN_FIELD_MAP[fieldId];
  }

  return fieldId;
};

const toPayloadValue = (value: FormValue | FormValue[] | undefined): FormValue => {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        result.push(item);
      }
    }
    return result;
  }
  return value ?? null;
};

const rowToRecord = (row: FormFieldType[], tabId: string, useOriginal = false): Record<string, FormValue> => {
  const record: Record<string, FormValue> = {};

  for (const cell of row) {
    const key = mapFieldId(tabId, cell.id);
    record[key] = toPayloadValue(useOriginal ? cell.originalValue : cell.value);
  }

  return record;
};

const isRowAdded = (row: FormFieldType[]): boolean => row.some((cell) => cell.added);
const isRowDeleted = (row: FormFieldType[]): boolean => row.some((cell) => cell.deleted);
const isRowUpdated = (row: FormFieldType[]): boolean =>
  row.some((cell) => cell.updated) && !isRowAdded(row) && !isRowDeleted(row);

const hasGeneralChanges = (general: GeneralFieldType[]): boolean =>
  general.some((field) => JSON.stringify(field.value) !== JSON.stringify(field.originalValue));

const buildGeneralTableRecord = (general: GeneralFieldType[], useOriginal = false): Record<string, FormValue> => {
  const record: Record<string, FormValue> = {};

  for (const field of general) {
    const key = MYSQL_TABLE_FIELD_MAP[field.id] ?? field.id;
    record[key] = toPayloadValue(useOriginal ? field.originalValue : field.value);
  }

  return record;
};

const hasTableTabChanges = (formData: FormObjectData): boolean => {
  if (formData.general.length > 0) {
    return hasGeneralChanges(formData.general);
  }

  const row = formData.data[0];
  if (!row) return false;

  return row.some((cell) => JSON.stringify(cell.value) !== JSON.stringify(cell.originalValue));
};

const buildTablePayload = (formData: FormObjectData, action: string): Record<string, unknown> | null => {
  if (!TABLE_ACTIONS.has(action)) return null;

  const hasChanges = hasTableTabChanges(formData);
  if (action === 'editTable' && !hasChanges) return null;

  const newRecord =
    formData.general.length > 0
      ? buildGeneralTableRecord(formData.general)
      : rowToRecord(formData.data[0] ?? [], 'table');
  const oldRecord =
    formData.general.length > 0
      ? buildGeneralTableRecord(formData.general, true)
      : rowToRecord(formData.data[0] ?? [], 'table', true);

  return {
    table: {
      new: newRecord,
      old: oldRecord
    }
  };
};

const buildArrayTabPayload = (
  tabId: string,
  formData: FormObjectData,
  action: string
): Record<string, unknown> | null => {
  const columns: ColumnChange[] = [];
  const isCreate = action === 'createTable';

  for (const row of formData.data) {
    if (isRowAdded(row) && isRowDeleted(row)) continue;

    if (isCreate) {
      if (!isRowDeleted(row)) {
        columns.push({
          new: rowToRecord(row, tabId),
          old: {},
          added: true
        });
      }
      continue;
    }

    if (isRowDeleted(row)) {
      const oldRecord = rowToRecord(row, tabId, true);
      columns.push({
        new: oldRecord,
        old: oldRecord,
        deleted: true
      });
      continue;
    }

    if (isRowAdded(row)) {
      columns.push({
        new: rowToRecord(row, tabId),
        old: {},
        added: true
      });
      continue;
    }

    if (isRowUpdated(row)) {
      columns.push({
        new: rowToRecord(row, tabId),
        old: rowToRecord(row, tabId, true)
      });
    }
  }

  if (columns.length === 0) return null;

  return {
    [tabId]: { columns }
  };
};

const buildViewPayload = (formData: FormObjectData, action: string): Record<string, unknown> | null => {
  if (!VIEW_ACTIONS.has(action)) return null;

  const row = formData.data[0];
  if (!row) return null;

  const hasChanges = row.some((cell) => JSON.stringify(cell.value) !== JSON.stringify(cell.originalValue));

  if (action === 'editView' && !hasChanges) return null;

  return {
    view: {
      new: rowToRecord(row, 'view'),
      old: rowToRecord(row, 'view', true)
    }
  };
};

export const buildSavePayload = (
  formDataByTab: Record<string, FormObjectData>,
  tabs: ObjectTabType[],
  action: string,
  objectPrefix: string
): Record<string, unknown> | null => {
  const payload: Record<string, unknown> = {};

  const tableTabData = formDataByTab[`${objectPrefix}_table`];
  const columnsTabData = formDataByTab[`${objectPrefix}_table_columns`];

  if (TABLE_ACTIONS.has(action)) {
    const tablePayload =
      (tableTabData ? buildTablePayload(tableTabData, action) : null) ??
      (columnsTabData?.general.length ? buildTablePayload(columnsTabData, action) : null);

    if (tablePayload) {
      Object.assign(payload, tablePayload);
    }
  }

  for (const tab of tabs) {
    const tabKey = `${objectPrefix}_${tab.id}`;
    const formData = formDataByTab[tabKey];
    if (!formData) continue;

    if (ARRAY_TAB_IDS.has(tab.id)) {
      const arrayPayload = buildArrayTabPayload(tab.id, formData, action);
      if (arrayPayload) {
        Object.assign(payload, arrayPayload);
      }
      continue;
    }

    if (tab.id === 'view') {
      const viewPayload = buildViewPayload(formData, action);
      if (viewPayload) {
        Object.assign(payload, viewPayload);
      }
    }
  }

  return Object.keys(payload).length > 0 ? payload : null;
};

type ObjectNamePayload = {
  new?: Record<string, FormValue>;
  old?: Record<string, FormValue>;
};

export const extractNodeIdAfterSave = (
  payload: Record<string, unknown>,
  currentNodeId: string,
  action: string
): string | null => {
  const tablePayload = payload.table as ObjectNamePayload | undefined;
  const tableNewName = tablePayload?.new?.name ?? tablePayload?.new?.relname;
  if (tableNewName) {
    const newName = String(tableNewName);
    if (action === 'createTable' || newName !== currentNodeId) {
      return newName;
    }
  }

  const viewPayload = payload.view as ObjectNamePayload | undefined;
  if (viewPayload?.new?.name) {
    const newName = String(viewPayload.new.name);
    if (action === 'createView' || newName !== currentNodeId) {
      return newName;
    }
  }

  return null;
};
