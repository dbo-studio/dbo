import type { AutoCompleteType } from '@/types';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';
import type { ICompletionItem } from 'monaco-sql-languages';

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

export function getDataBasesAndSchemas(languageId: string): ICompletionItem[] {
  const databaseAndSchemas = getDataBases(languageId);

  databaseAndSchemas.concat(getSchemas(languageId));

  return databaseAndSchemas;
}

export function getDataBases(languageId: string): ICompletionItem[] {
  const databaseCompletions = autocomplete.databases.map((db) => ({
    label: db,
    kind: languages.CompletionItemKind.Field,
    detail: 'database',
    sortText: `1${prefixLabel(languageId, db)}`
  }));

  return databaseCompletions;
}

export function getSchemas(languageId: string): ICompletionItem[] {
  const schemaCompletions = autocomplete.schemas.map((sc) => ({
    label: sc,
    kind: languages.CompletionItemKind.Field,
    detail: 'schema',
    sortText: `1${prefixLabel(languageId, sc)}`
  }));

  return schemaCompletions;
}

export function getTables(languageId: string): ICompletionItem[] {
  const tableCompletions = autocomplete.tables.map((tb) => ({
    label: tb,
    kind: languages.CompletionItemKind.Field,
    detail: 'table',
    sortText: `1${prefixLabel(languageId, tb)}`
  }));

  return tableCompletions;
}

export function getViews(languageId: string): ICompletionItem[] {
  const viewCompletions = autocomplete.views.map((v) => ({
    label: v,
    kind: languages.CompletionItemKind.Field,
    detail: 'view',
    sortText: `1${prefixLabel(languageId, v)}`
  }));

  return viewCompletions;
}

export function getColumns(languageId: string, tableName?: string): ICompletionItem[] {
  if (!tableName || !Object.prototype.hasOwnProperty.call(autocomplete.columns, tableName)) {
    return [];
  }
  const columnCompletions = autocomplete.columns[tableName].map((c) => ({
    label: c,
    kind: languages.CompletionItemKind.Field,
    detail: 'column',
    sortText: `1${prefixLabel(languageId, c)}`
  }));

  return columnCompletions;
}
