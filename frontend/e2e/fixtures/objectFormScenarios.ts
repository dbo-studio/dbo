import type { DbEngine } from './dbConfigs';

export type TableNameFieldLocation = 'general' | 'array';

export type CreateTableScenario = {
  engine: DbEngine;
  treePath: (connectionName: string) => string[];
  tableTabId: string | null;
  tableName: { location: TableNameFieldLocation; fieldId: string; rowIndex?: number };
  columnsTabId: string;
  columnNameFieldId: string;
  columnTypeFieldId: string;
  integerTypeLabel: string;
  textTypeLabel: string;
  previewCreatePattern: RegExp;
};

export type EditTableScenario = {
  engine: DbEngine;
  treePath: (connectionName: string) => string[];
  columnsTabId: string;
  columnNameFieldId: string;
  columnTypeFieldId: string;
  textTypeLabel: string;
  previewEditPattern: RegExp;
};

export const CREATE_TABLE_SCENARIOS: CreateTableScenario[] = [
  {
    engine: 'postgresql',
    treePath: (connectionName) => [connectionName, 'default', 'public'],
    tableTabId: null,
    tableName: { location: 'general', fieldId: 'relname' },
    columnsTabId: 'table_columns',
    columnNameFieldId: 'column_name',
    columnTypeFieldId: 'data_type',
    integerTypeLabel: 'integer',
    textTypeLabel: 'text',
    previewCreatePattern: /CREATE TABLE/i
  },
  {
    engine: 'mysql',
    treePath: (connectionName) => [connectionName, 'default'],
    tableTabId: null,
    tableName: { location: 'general', fieldId: 'TABLE_NAME' },
    columnsTabId: 'table_columns',
    columnNameFieldId: 'COLUMN_NAME',
    columnTypeFieldId: 'DATA_TYPE',
    integerTypeLabel: 'INT',
    textTypeLabel: 'VARCHAR',
    previewCreatePattern: /CREATE TABLE/i
  },
  {
    engine: 'sqlite',
    treePath: (connectionName) => [connectionName],
    tableTabId: null,
    tableName: { location: 'general', fieldId: 'name' },
    columnsTabId: 'table_columns',
    columnNameFieldId: 'name',
    columnTypeFieldId: 'type',
    integerTypeLabel: 'INTEGER',
    textTypeLabel: 'TEXT',
    previewCreatePattern: /CREATE TABLE/i
  }
];

export const EDIT_TABLE_SCENARIOS: EditTableScenario[] = [
  {
    engine: 'postgresql',
    treePath: (connectionName) => [connectionName, 'default', 'public'],
    columnsTabId: 'table_columns',
    columnNameFieldId: 'column_name',
    columnTypeFieldId: 'data_type',
    textTypeLabel: 'text',
    previewEditPattern: /ADD COLUMN/i
  },
  {
    engine: 'mysql',
    treePath: (connectionName) => [connectionName, 'default'],
    columnsTabId: 'table_columns',
    columnNameFieldId: 'COLUMN_NAME',
    columnTypeFieldId: 'DATA_TYPE',
    textTypeLabel: 'VARCHAR',
    previewEditPattern: /ADD COLUMN/i
  },
  {
    engine: 'sqlite',
    treePath: (connectionName) => [connectionName],
    columnsTabId: 'table_columns',
    columnNameFieldId: 'name',
    columnTypeFieldId: 'type',
    textTypeLabel: 'TEXT',
    previewEditPattern: /CREATE TABLE/i
  }
];
