export type SqlSnippet = { title: string; sql: string };
export type SqlSnippetGroup = { group: string; items: SqlSnippet[] };

// Generic ANSI-style templates; replace the placeholders (table, column, value) before running.
export const SQL_SNIPPETS: SqlSnippetGroup[] = [
  {
    group: 'Select',
    items: [
      { title: 'Select all', sql: 'SELECT *\nFROM table_name\nLIMIT 100;' },
      { title: 'Select columns', sql: 'SELECT column1, column2\nFROM table_name;' },
      { title: 'Distinct values', sql: 'SELECT DISTINCT column1\nFROM table_name;' },
      { title: 'Count rows', sql: 'SELECT COUNT(*)\nFROM table_name;' }
    ]
  },
  {
    group: 'Insert',
    items: [
      {
        title: 'Insert row',
        sql: "INSERT INTO table_name (column1, column2)\nVALUES ('value1', 'value2');"
      },
      {
        title: 'Insert multiple rows',
        sql: "INSERT INTO table_name (column1, column2)\nVALUES\n  ('value1', 'value2'),\n  ('value3', 'value4');"
      },
      {
        title: 'Insert from select',
        sql: 'INSERT INTO target_table (column1, column2)\nSELECT column1, column2\nFROM source_table\nWHERE condition;'
      }
    ]
  },
  {
    group: 'Update',
    items: [
      { title: 'Update rows', sql: "UPDATE table_name\nSET column1 = 'value1', column2 = 'value2'\nWHERE id = 1;" },
      {
        title: 'Update from another table',
        sql: 'UPDATE t1\nSET column1 = t2.column1\nFROM table1 t1\nJOIN table2 t2 ON t1.id = t2.id;'
      }
    ]
  },
  {
    group: 'Delete',
    items: [
      { title: 'Delete rows', sql: 'DELETE FROM table_name\nWHERE id = 1;' },
      {
        title: 'Delete duplicates (keep lowest id)',
        sql: 'DELETE FROM table_name\nWHERE id NOT IN (\n  SELECT MIN(id)\n  FROM table_name\n  GROUP BY column1\n);'
      }
    ]
  },
  {
    group: 'Join',
    items: [
      {
        title: 'Inner join',
        sql: 'SELECT a.*, b.*\nFROM table_a a\nINNER JOIN table_b b ON a.id = b.a_id;'
      },
      {
        title: 'Left join',
        sql: 'SELECT a.*, b.*\nFROM table_a a\nLEFT JOIN table_b b ON a.id = b.a_id;'
      },
      {
        title: 'Rows without a match',
        sql: 'SELECT a.*\nFROM table_a a\nLEFT JOIN table_b b ON a.id = b.a_id\nWHERE b.a_id IS NULL;'
      }
    ]
  },
  {
    group: 'Filter',
    items: [
      {
        title: 'Where / AND / OR',
        sql: "SELECT *\nFROM table_name\nWHERE column1 = 'value'\n  AND (column2 > 10 OR column3 IS NULL);"
      },
      { title: 'IN list', sql: "SELECT *\nFROM table_name\nWHERE column1 IN ('a', 'b', 'c');" },
      { title: 'Between', sql: "SELECT *\nFROM table_name\nWHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';" },
      { title: 'LIKE', sql: "SELECT *\nFROM table_name\nWHERE column1 LIKE '%text%';" },
      { title: 'Is null / not null', sql: 'SELECT *\nFROM table_name\nWHERE column1 IS NOT NULL;' }
    ]
  },
  {
    group: 'Aggregate',
    items: [
      {
        title: 'Group by',
        sql: 'SELECT column1, COUNT(*) AS total\nFROM table_name\nGROUP BY column1\nORDER BY total DESC;'
      },
      {
        title: 'Having',
        sql: 'SELECT column1, COUNT(*) AS total\nFROM table_name\nGROUP BY column1\nHAVING COUNT(*) > 1;'
      },
      {
        title: 'Find duplicates',
        sql: 'SELECT column1, COUNT(*)\nFROM table_name\nGROUP BY column1\nHAVING COUNT(*) > 1;'
      }
    ]
  },
  {
    group: 'Schema',
    items: [
      {
        title: 'Create table',
        sql: 'CREATE TABLE table_name (\n  id INTEGER PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  created_at TIMESTAMP\n);'
      },
      { title: 'Add column', sql: 'ALTER TABLE table_name\nADD COLUMN column_name VARCHAR(255);' },
      { title: 'Create index', sql: 'CREATE INDEX idx_table_column\nON table_name (column_name);' },
      { title: 'Drop table', sql: 'DROP TABLE table_name;' }
    ]
  }
];
