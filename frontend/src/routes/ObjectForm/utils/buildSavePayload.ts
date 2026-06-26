import type { FormObjectData } from '@/store/formObject/types';
import { ObjectTabType } from '@/types';
import { FormFieldType, FormValue, GeneralFieldType } from '@/types/Tree';

const TABLE_ACTIONS = new Set(['createTable', 'editTable']);

type ColumnChange = {
  new: Record<string, FormValue>;
  old: Record<string, FormValue>;
  added?: boolean;
  deleted?: boolean;
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

const rowToRecord = (row: FormFieldType[], useOriginal = false): Record<string, FormValue> => {
  const record: Record<string, FormValue> = {};

  for (const cell of row) {
    record[cell.id] = toPayloadValue(useOriginal ? cell.originalValue : cell.value);
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
    record[field.id] = toPayloadValue(useOriginal ? field.originalValue : field.value);
  }

  return record;
};

const buildNewOldPair = (general: GeneralFieldType[]): { new: Record<string, FormValue>; old: Record<string, FormValue> } => ({
  new: buildGeneralRecord(general),
  old: buildGeneralRecord(general, true)
});

const buildGeneralTabPayload = (
  saveKey: string,
  formData: FormObjectData,
  action: string
): Record<string, unknown> | null => {
  if (formData.general.length === 0) return null;

  const isEdit = action.startsWith('edit');
  if (isEdit && !hasGeneralChanges(formData.general)) return null;

  return {
    [saveKey]: buildNewOldPair(formData.general)
  };
};

const buildArrayTabPayload = (
  tabId: string,
  formData: FormObjectData,
  action: string
): Record<string, unknown> | null => {
  if (formData.schema.length === 0) return null;

  const columns: ColumnChange[] = [];
  const isCreate = action === 'createTable';

  for (const row of formData.data) {
    if (isRowAdded(row) && isRowDeleted(row)) continue;

    if (isCreate) {
      if (!isRowDeleted(row)) {
        columns.push({
          new: rowToRecord(row),
          old: {},
          added: true
        });
      }
      continue;
    }

    if (isRowDeleted(row)) {
      const oldRecord = rowToRecord(row, true);
      columns.push({
        new: oldRecord,
        old: oldRecord,
        deleted: true
      });
      continue;
    }

    if (isRowAdded(row)) {
      columns.push({
        new: rowToRecord(row),
        old: {},
        added: true
      });
      continue;
    }

    if (isRowUpdated(row)) {
      columns.push({
        new: rowToRecord(row),
        old: rowToRecord(row, true)
      });
    }
  }

  if (columns.length === 0) return null;

  return {
    [tabId]: { columns }
  };
};

const resolveGeneralSaveKey = (tabId: string, action: string): string | null => {
  if (TABLE_ACTIONS.has(action)) {
    return 'general';
  }

  if (tabId === 'database' || tabId === 'schema' || tabId === 'view' || tabId === 'materialized_view') {
    return tabId;
  }

  return null;
};

export const buildSavePayload = (
  formDataByTab: Record<string, FormObjectData>,
  tabs: ObjectTabType[],
  action: string,
  objectPrefix: string
): Record<string, unknown> | null => {
  const payload: Record<string, unknown> = {};

  for (const tab of tabs) {
    const tabKey = `${objectPrefix}_${tab.id}`;
    const formData = formDataByTab[tabKey];
    if (!formData) continue;

    const generalSaveKey = resolveGeneralSaveKey(tab.id, action);
    if (generalSaveKey) {
      const generalPayload = buildGeneralTabPayload(generalSaveKey, formData, action);
      if (generalPayload) {
        Object.assign(payload, generalPayload);
      }
    }

    const arrayPayload = buildArrayTabPayload(tab.id, formData, action);
    if (arrayPayload) {
      Object.assign(payload, arrayPayload);
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
  const databasePayload = payload.database as ObjectNamePayload | undefined;
  const databaseNewName = databasePayload?.new?.datname;
  if (databaseNewName) {
    const newName = String(databaseNewName);
    if (action === 'createDatabase' || newName !== currentNodeId) {
      return newName;
    }
  }

  const generalPayload = payload.general as ObjectNamePayload | undefined;
  const tableNewName = generalPayload?.new?.name ?? generalPayload?.new?.relname;
  if (tableNewName) {
    const newName = String(tableNewName);
    if (action === 'createTable' || newName !== currentNodeId) {
      return newName;
    }
  }

  const viewPayload = payload.view as ObjectNamePayload | undefined;
  const viewNewName = viewPayload?.new?.name;
  if (viewNewName) {
    const newName = String(viewNewName);
    if (action === 'createView' || newName !== currentNodeId) {
      return newName;
    }
  }

  const schemaPayload = payload.schema as ObjectNamePayload | undefined;
  const schemaNewName = schemaPayload?.new?.nspname;
  if (schemaNewName) {
    const newName = String(schemaNewName);
    if (action === 'createSchema' || newName !== currentNodeId) {
      return newName;
    }
  }

  const materializedViewPayload = payload.materialized_view as ObjectNamePayload | undefined;
  const matViewNewName = materializedViewPayload?.new?.name;
  if (matViewNewName) {
    const newName = String(matViewNewName);
    if (action === 'createMaterializedView' || newName !== currentNodeId) {
      return newName;
    }
  }

  return null;
};
