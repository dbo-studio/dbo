import { FormObjectData } from '@/store/formObject/types';
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

const mapFieldId = (tabId: string, fieldId: string): string => {
  if (tabId === 'table_foreign_keys' && fieldId === 'constraint_name') {
    return 'name';
  }
  return fieldId;
};

const rowToRecord = (row: FormFieldType[], tabId: string, useOriginal = false): Record<string, FormValue> => {
  const record: Record<string, FormValue> = {};

  for (const cell of row) {
    const key = mapFieldId(tabId, cell.id);
    record[key] = useOriginal ? (cell.originalValue ?? null) : (cell.value ?? null);
  }

  return record;
};

const isRowAdded = (row: FormFieldType[]): boolean => row.some((cell) => cell.added);
const isRowDeleted = (row: FormFieldType[]): boolean => row.some((cell) => cell.deleted);
const isRowUpdated = (row: FormFieldType[]): boolean =>
  row.some((cell) => cell.updated) && !isRowAdded(row) && !isRowDeleted(row);

const hasGeneralChanges = (general: GeneralFieldType[]): boolean =>
  general.some((field) => JSON.stringify(field.value) !== JSON.stringify(field.originalValue));

const buildGeneralRecord = (general: GeneralFieldType[], useOriginal = false): Record<string, FormValue> => {
  const record: Record<string, FormValue> = {};

  for (const field of general) {
    record[field.id] = useOriginal ? (field.originalValue ?? null) : (field.value ?? null);
  }

  return record;
};

const buildTablePayload = (
  general: GeneralFieldType[],
  action: string
): Record<string, unknown> | null => {
  if (!TABLE_ACTIONS.has(action)) return null;

  const hasChanges = hasGeneralChanges(general);
  if (action === 'editTable' && !hasChanges) return null;

  return {
    table: {
      new: buildGeneralRecord(general),
      old: buildGeneralRecord(general, true)
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

  const firstTabData = tabs
    .map((tab) => formDataByTab[`${objectPrefix}_${tab.id}`])
    .find((data) => data !== undefined);

  if (firstTabData && TABLE_ACTIONS.has(action)) {
    const tablePayload = buildTablePayload(firstTabData.general, action);
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
  if (tablePayload?.new?.name) {
    const newName = String(tablePayload.new.name);
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
