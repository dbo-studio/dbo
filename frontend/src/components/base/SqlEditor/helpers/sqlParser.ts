import type * as Monaco from 'monaco-editor';

export type SqlContext = {
  isInSelect: boolean;
  isInFrom: boolean;
  isInJoin: boolean;
  isInWhere: boolean;
  isInGroupBy: boolean;
  isInOrderBy: boolean;
  currentClause: 'SELECT' | 'FROM' | 'JOIN' | 'WHERE' | 'GROUP BY' | 'ORDER BY' | 'HAVING' | null;
  tables: string[];
  aliases: Map<string, string>; // alias -> table name
};

const SQL_FUNCTIONS = [
  // Aggregate functions
  { label: 'COUNT', detail: 'COUNT(column)', insertText: 'COUNT($0)', kind: 1 as const },
  { label: 'SUM', detail: 'SUM(column)', insertText: 'SUM($0)', kind: 1 as const },
  { label: 'AVG', detail: 'AVG(column)', insertText: 'AVG($0)', kind: 1 as const },
  { label: 'MIN', detail: 'MIN(column)', insertText: 'MIN($0)', kind: 1 as const },
  { label: 'MAX', detail: 'MAX(column)', insertText: 'MAX($0)', kind: 1 as const },
  { label: 'STRING_AGG', detail: 'STRING_AGG(column, separator)', insertText: 'STRING_AGG($0, $1)', kind: 1 as const },
  { label: 'ARRAY_AGG', detail: 'ARRAY_AGG(column)', insertText: 'ARRAY_AGG($0)', kind: 1 as const },

  // String functions
  { label: 'CONCAT', detail: 'CONCAT(str1, str2, ...)', insertText: 'CONCAT($0)', kind: 1 as const },
  {
    label: 'SUBSTRING',
    detail: 'SUBSTRING(str, start, length)',
    insertText: 'SUBSTRING($0, $1, $2)',
    kind: 1 as const
  },
  { label: 'UPPER', detail: 'UPPER(string)', insertText: 'UPPER($0)', kind: 1 as const },
  { label: 'LOWER', detail: 'LOWER(string)', insertText: 'LOWER($0)', kind: 1 as const },
  { label: 'TRIM', detail: 'TRIM(string)', insertText: 'TRIM($0)', kind: 1 as const },
  { label: 'LENGTH', detail: 'LENGTH(string)', insertText: 'LENGTH($0)', kind: 1 as const },
  { label: 'REPLACE', detail: 'REPLACE(str, old, new)', insertText: 'REPLACE($0, $1, $2)', kind: 1 as const },

  // Date functions
  { label: 'NOW', detail: 'NOW()', insertText: 'NOW()', kind: 1 as const },
  { label: 'CURRENT_DATE', detail: 'CURRENT_DATE', insertText: 'CURRENT_DATE', kind: 1 as const },
  { label: 'CURRENT_TIME', detail: 'CURRENT_TIME', insertText: 'CURRENT_TIME', kind: 1 as const },
  { label: 'CURRENT_TIMESTAMP', detail: 'CURRENT_TIMESTAMP', insertText: 'CURRENT_TIMESTAMP', kind: 1 as const },
  { label: 'EXTRACT', detail: 'EXTRACT(field FROM date)', insertText: 'EXTRACT($0 FROM $1)', kind: 1 as const },
  { label: 'DATE_PART', detail: 'DATE_PART(field, date)', insertText: 'DATE_PART($0, $1)', kind: 1 as const },
  { label: 'TO_DATE', detail: 'TO_DATE(string, format)', insertText: 'TO_DATE($0, $1)', kind: 1 as const },

  // Numeric functions
  { label: 'ROUND', detail: 'ROUND(number, decimals)', insertText: 'ROUND($0, $1)', kind: 1 as const },
  { label: 'CEIL', detail: 'CEIL(number)', insertText: 'CEIL($0)', kind: 1 as const },
  { label: 'FLOOR', detail: 'FLOOR(number)', insertText: 'FLOOR($0)', kind: 1 as const },
  { label: 'ABS', detail: 'ABS(number)', insertText: 'ABS($0)', kind: 1 as const },
  { label: 'MOD', detail: 'MOD(dividend, divisor)', insertText: 'MOD($0, $1)', kind: 1 as const },

  // Type conversion
  { label: 'CAST', detail: 'CAST(value AS type)', insertText: 'CAST($0 AS $1)', kind: 1 as const },
  { label: 'COALESCE', detail: 'COALESCE(value1, value2, ...)', insertText: 'COALESCE($0, $1)', kind: 1 as const },
  { label: 'NULLIF', detail: 'NULLIF(value1, value2)', insertText: 'NULLIF($0, $1)', kind: 1 as const },

  // PostgreSQL specific
  {
    label: 'ARRAY_LENGTH',
    detail: 'ARRAY_LENGTH(array, dimension)',
    insertText: 'ARRAY_LENGTH($0, $1)',
    kind: 1 as const
  },
  {
    label: 'JSONB_BUILD_OBJECT',
    detail: 'JSONB_BUILD_OBJECT(key1, val1, ...)',
    insertText: 'JSONB_BUILD_OBJECT($0)',
    kind: 1 as const
  }
];

export function parseSqlContext(model: Monaco.editor.ITextModel, position: Monaco.Position): SqlContext {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  });

  const context: SqlContext = {
    isInSelect: false,
    isInFrom: false,
    isInJoin: false,
    isInWhere: false,
    isInGroupBy: false,
    isInOrderBy: false,
    currentClause: null,
    tables: [],
    aliases: new Map()
  };

  // Normalize text for parsing (remove comments, normalize whitespace)
  const normalizedText = textUntilPosition
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Detect current clause (case-insensitive)
  const upperText = normalizedText.toUpperCase();

  const lastSelectIndex = upperText.lastIndexOf('SELECT');
  const lastFromIndex = upperText.lastIndexOf('FROM');
  const lastJoinIndex = Math.max(
    upperText.lastIndexOf(' INNER JOIN'),
    upperText.lastIndexOf(' LEFT JOIN'),
    upperText.lastIndexOf(' RIGHT JOIN'),
    upperText.lastIndexOf(' FULL JOIN'),
    upperText.lastIndexOf(' JOIN')
  );
  const lastWhereIndex = upperText.lastIndexOf('WHERE');
  const lastGroupByIndex = upperText.lastIndexOf('GROUP BY');
  const lastOrderByIndex = upperText.lastIndexOf('ORDER BY');
  const lastHavingIndex = upperText.lastIndexOf('HAVING');

  const clauseIndices = [
    { clause: 'SELECT' as const, index: lastSelectIndex },
    { clause: 'FROM' as const, index: lastFromIndex },
    { clause: 'JOIN' as const, index: lastJoinIndex },
    { clause: 'WHERE' as const, index: lastWhereIndex },
    { clause: 'GROUP BY' as const, index: lastGroupByIndex },
    { clause: 'ORDER BY' as const, index: lastOrderByIndex },
    { clause: 'HAVING' as const, index: lastHavingIndex }
  ]
    .filter((c) => c.index >= 0)
    .sort((a, b) => b.index - a.index);

  if (clauseIndices.length > 0) {
    context.currentClause = clauseIndices[0].clause;
    context.isInSelect = context.currentClause === 'SELECT';
    context.isInFrom = context.currentClause === 'FROM';
    context.isInJoin = context.currentClause === 'JOIN';
    context.isInWhere = context.currentClause === 'WHERE';
    context.isInGroupBy = context.currentClause === 'GROUP BY';
    context.isInOrderBy = context.currentClause === 'ORDER BY';
  }

  // Extract tables and aliases from FROM and JOIN clauses
  const fromJoinRegex = /(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)(?:\s+AS\s+|\s+)([a-zA-Z0-9_]+)?/gi;
  let match;

  while ((match = fromJoinRegex.exec(normalizedText)) !== null) {
    const tableName = match[1];
    const alias = match[2] || tableName;

    if (!context.tables.includes(tableName)) {
      context.tables.push(tableName);
    }

    if (alias && alias !== tableName) {
      context.aliases.set(alias.toLowerCase(), tableName);
    }
    context.aliases.set(tableName.toLowerCase(), tableName);
  }

  // Also handle table.column and alias.column patterns
  const tableColumnRegex = /\b([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\b/g;
  while ((match = tableColumnRegex.exec(normalizedText)) !== null) {
    const possibleTable = match[1].toLowerCase();
    if (context.aliases.has(possibleTable) || context.tables.includes(possibleTable)) {
      // This is already recognized as a table/alias
    }
  }

  return context;
}

export function getAllTableNames(model: Monaco.editor.ITextModel, position: Monaco.Position): string[] {
  const context = parseSqlContext(model, position);
  return context.tables;
}

export function getTableForAlias(
  model: Monaco.editor.ITextModel,
  position: Monaco.Position,
  alias: string
): string | null {
  const context = parseSqlContext(model, position);
  return context.aliases.get(alias.toLowerCase()) || null;
}

export function getSqlFunctions(): typeof SQL_FUNCTIONS {
  return SQL_FUNCTIONS;
}
