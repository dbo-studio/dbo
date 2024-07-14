import { languages } from 'monaco-editor/esm/vs/editor/editor.api';

const catalogList = ['mock_catalog_1', 'mock_catalog_2', 'mock_catalog_3'];
const schemaList = ['mock_schema_1', 'mock_schema_2', 'mock_schema_3'];
const databaseList = ['mock_database_1', 'mock_database_2', 'mock_database_3'];
const tableList = ['mock_table1', 'mock_table2', 'mock_table3'];
const viewList = ['mock_view1', 'mock_view2', 'mock_view3'];

const tmpDatabaseList = ['current_catalog_db1', 'current_catalog_db2', 'current_catalog_db3'];
const tmpSchemaList = ['current_catalog_schema1', 'current_catalog_schema2', 'current_catalog_schema3'];
const tmpTableList = ['current_db_table1', 'current_db_table2', 'current_db_table3'];
const tmpViewList = ['current_db_view1', 'current_db_view2', 'current_db_view3'];

const prefixLabel = (languageId: string, text: string) => {
  const prefix = languageId ? languageId.replace(/sql/gi, '').toLocaleLowerCase() : '';
  return prefix ? `${prefix}_${text}` : text;
};

/**
 * 获取所有的 catalog
 */
export function getCatalogs(languageId: string) {
  const catCompletions = catalogList.map((cat) => ({
    // label: prefixLabel(languageId, cat),
    label: cat,
    kind: languages.CompletionItemKind.Field,
    detail: 'catalog',
    sortText: '1' + prefixLabel(languageId, cat)
  }));
  return Promise.resolve(catCompletions);
}

/**
 * 根据catalog 获取 database
 */
export function getDataBases(languageId: string, catalog?: string) {
  const databases = catalog ? databaseList : tmpDatabaseList;
  console.log('🚀 ~ getDataBases ~ catalog:', catalog);
  console.log('🚀 ~ getDataBases ~ databases:', databases);

  const databaseCompletions = databases.map((db) => ({
    // label: prefixLabel(languageId, db),
    label: db,
    kind: languages.CompletionItemKind.Field,
    detail: 'database',
    sortText: '1' + prefixLabel(languageId, db)
  }));

  return Promise.resolve(databaseCompletions);
}

/**
 * 根据catalog 获取 schema
 */
export function getSchemas(languageId: string, catalog?: string) {
  const schemas = catalog ? schemaList : tmpSchemaList;
  console.log('🚀 ~ getSchemas ~ schemas:', schemas);
  console.log('🚀 ~ getSchemas ~ catalog:', catalog);

  const schemaCompletions = schemas.map((sc) => ({
    // label: prefixLabel(languageId, sc),
    label: sc,
    kind: languages.CompletionItemKind.Field,
    detail: 'schema',
    sortText: '1' + prefixLabel(languageId, sc)
  }));

  return Promise.resolve(schemaCompletions);
}

/**
 * 根据 catalog 和 database 获取 table
 */
export function getTables(languageId: string, catalog?: string, database?: string) {
  const tables = catalog && database ? tableList : tmpTableList;
  console.log('🚀 ~ getTables ~ catalog:', catalog);
  console.log('🚀 ~ getTables ~ tables:', tables);
  console.log('🚀 ~ getTables ~ database:', database);

  const tableCompletions = tables.map((tb) => ({
    // label: prefixLabel(languageId, tb),
    label: tb,
    kind: languages.CompletionItemKind.Field,
    detail: 'table',
    sortText: '1' + prefixLabel(languageId, tb)
  }));

  return Promise.resolve(tableCompletions);
}

/**
 * 根据 catalog 和 database 获取 view
 */
export function getViews(languageId: string, catalog?: string, database?: string) {
  const views = catalog && database ? viewList : tmpViewList;

  const viewCompletions = views.map((v) => ({
    // label: prefixLabel(languageId, v),
    label: v,
    kind: languages.CompletionItemKind.Field,
    detail: 'view',
    sortText: '1' + prefixLabel(languageId, v)
  }));

  return Promise.resolve(viewCompletions);
}
