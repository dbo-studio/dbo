import api from '@/api';
import { AutoCompleteType } from '@/api/query/types.ts';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';
import { ICompletionItem } from 'monaco-sql-languages';

const prefixLabel = (languageId: string, text: string) => {
  const prefix = languageId ? languageId.replace(/sql/gi, '').toLocaleLowerCase() : '';
  return prefix ? `${prefix}_${text}` : text;
};

let databaseCompletions: ICompletionItem[] | undefined = undefined;
let schemaCompletions: ICompletionItem[] | undefined = undefined;
let viewCompletions: ICompletionItem[] | undefined = undefined;
const tableCompletions: {
  [key: string]: ICompletionItem[];
}[] = [];

export function getCatalogs(languageId: string) {
  console.log('🚀 ~ getCatalogs ~ _languageId:', languageId);
  return Promise.resolve([]);
}

export async function getDataBasesAndSchemas(languageId: string, catalog?: string) {
  const databaseAndSchemas = await getDataBases(languageId, catalog);

  databaseAndSchemas.concat(await getSchemas(languageId, catalog));
  console.log('🚀 ~ getDataBasesAndSchemas ~ databaseAndSchemas:', databaseAndSchemas);

  return Promise.resolve(databaseAndSchemas);
}

export async function getDataBases(languageId: string, catalog?: string): Promise<ICompletionItem[]> {
  if (databaseCompletions) {
    return Promise.resolve(databaseCompletions);
  }
  const databases = await requestAutoComplete({
    connection_id: 1,
    type: 'databases'
  });
  console.log('🚀 ~ getDataBases ~ databases:', databases);
  console.log('🚀 ~ getDataBases ~ catalog:', catalog);

  databaseCompletions = databases.map((db) => ({
    label: db,
    kind: languages.CompletionItemKind.Field,
    detail: 'database',
    sortText: '1' + prefixLabel(languageId, db)
  }));

  return Promise.resolve(databaseCompletions);
}

export async function getSchemas(languageId: string, catalog?: string): Promise<ICompletionItem[]> {
  if (schemaCompletions) {
    return Promise.resolve(schemaCompletions);
  }

  const schemas = await requestAutoComplete({
    connection_id: 1,
    type: 'schemas'
  });
  console.log('🚀 ~ getSchemas ~ schemas:', schemas);
  console.log('🚀 ~ getSchemas ~ catalog:', catalog);

  schemaCompletions = schemas.map((sc) => ({
    label: sc,
    kind: languages.CompletionItemKind.Field,
    detail: 'schema',
    sortText: '1' + prefixLabel(languageId, sc)
  }));

  return Promise.resolve(schemaCompletions);
}

export async function getTables(languageId: string, catalog?: string, database?: string): Promise<ICompletionItem[]> {
  const dbName: string = database ?? 'empty';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  if (tableCompletions[dbName]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return tableCompletions[dbName];
  }

  const tables = await requestAutoComplete({
    connection_id: 1,
    type: 'tables',
    schema: database ?? ''
  });
  console.log('🚀 ~ getTables ~ tables:', tables);
  console.log('🚀 ~ getTables ~ catalog:', catalog);
  console.log('🚀 ~ getTables ~ database:', database);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  tableCompletions[dbName] = tables.map((tb) => ({
    label: tb,
    kind: languages.CompletionItemKind.Field,
    detail: 'table',
    sortText: '1' + prefixLabel(languageId, tb)
  }));

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return Promise.resolve(tableCompletions[dbName]);
}

export async function getViews(languageId: string, catalog?: string, database?: string): Promise<ICompletionItem[]> {
  if (viewCompletions) {
    return Promise.resolve(viewCompletions);
  }
  const views = await requestAutoComplete({
    connection_id: 1,
    type: 'views',
    database: database
  });
  console.log('🚀 ~ getViews ~ views:', views);
  console.log('🚀 ~ getViews ~ catalog:', catalog);

  viewCompletions = views.map((v) => ({
    label: v,
    kind: languages.CompletionItemKind.Field,
    detail: 'view',
    sortText: '1' + prefixLabel(languageId, v)
  }));

  return Promise.resolve(viewCompletions);
}

export async function getColumns(languageId: string, tableName?: string): Promise<ICompletionItem[]> {
  const columns: string[] = await requestAutoComplete({
    connection_id: 1,
    type: 'columns',
    table: tableName,
    schema: ''
  });
  console.log('🚀 ~ getColumns ~ columns:', columns);

  const columnCompletions = columns.map((c) => ({
    label: c,
    kind: languages.CompletionItemKind.Field,
    detail: 'column',
    sortText: '1' + prefixLabel(languageId, c)
  }));

  return Promise.resolve(columnCompletions);
}

async function requestAutoComplete(data: AutoCompleteType): Promise<string[]> {
  return api.query.autoComplete({
    ...data,
    from_cache: true
  });
}
