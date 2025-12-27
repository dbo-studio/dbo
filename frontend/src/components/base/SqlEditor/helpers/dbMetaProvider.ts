import type { AutoCompleteType } from '@/types';
import type * as monaco from 'monaco-editor';
import { CompletionItemKind } from './constants';

const prefixLabel = (languageId: string, text: string): string => {
  const prefix = languageId ? languageId.replace(/sql/gi, '').toLocaleLowerCase() : '';
  return prefix ? `${prefix}_${text}` : text;
};

let autocomplete: AutoCompleteType = {
  databases: [],
  views: [],
  schemas: [],
  tables: [],
  columns: {}
};

export function changeMetaProviderSetting(at: AutoCompleteType): void {
  autocomplete = at;
}

export function getDataBasesAndSchemas(languageId: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  const databaseAndSchemas = getDataBases(languageId);

  return databaseAndSchemas.concat(getSchemas(languageId));
}

function getDataBases(languageId: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  const databaseCompletions = autocomplete.databases.map((db) => ({
    label: db,
    kind: CompletionItemKind.Field,
    detail: 'database',
    insertText: db,
    sortText: `1${prefixLabel(languageId, db)}`
  }));

  return databaseCompletions;
}

function getSchemas(languageId: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  const schemaCompletions = autocomplete.schemas.map((sc) => ({
    label: sc,
    kind: CompletionItemKind.Field,
    detail: 'schema',
    insertText: sc,
    sortText: `1${prefixLabel(languageId, sc)}`
  }));

  return schemaCompletions;
}

export function getTables(languageId: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  const tableCompletions = autocomplete.tables.map((tb) => ({
    label: tb,
    kind: CompletionItemKind.Field,
    detail: 'table',
    insertText: tb,
    sortText: `1${prefixLabel(languageId, tb)}`
  }));

  return tableCompletions;
}

export function getViews(languageId: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  const viewCompletions = autocomplete.views.map((v) => ({
    label: v,
    kind: CompletionItemKind.Field,
    detail: 'view',
    insertText: v,
    sortText: `1${prefixLabel(languageId, v)}`
  }));

  return viewCompletions;
}

export function getColumns(languageId: string, tableName?: string): Omit<monaco.languages.CompletionItem, 'range'>[] {
  if (!tableName || !(tableName in autocomplete.columns)) {
    return [];
  }
  const columnCompletions = autocomplete.columns[tableName].map((c) => ({
    label: c,
    kind: CompletionItemKind.Field,
    detail: 'column',
    insertText: c,
    sortText: `1${prefixLabel(languageId, c)}`
  }));

  return columnCompletions;
}
