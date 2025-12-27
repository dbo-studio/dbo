/**
 * Monaco Editor constants and configuration values
 */

// Completion Item Kinds (from Monaco Editor)
export const CompletionItemKind = {
  Function: 1,
  Variable: 2,
  Field: 5,
  Keyword: 19,
  Text: 1
} as const;

// Completion Item Insert Text Rules
export const CompletionItemInsertTextRule = {
  InsertAsSnippet: 4
} as const;

// Marker Severity (from Monaco Editor)
export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8
} as const;

// Debounce delays
export const DEBOUNCE_DELAYS = {
  inlineAITrigger: 500,
  inlineAIProvider: 300,
  sqlValidation: 500
} as const;

// Minimum text length for AI completion
export const MIN_TEXT_LENGTH_FOR_AI = 10;

// SQL Keywords
export const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'TABLE',
  'VIEW',
  'INDEX',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'OUTER',
  'ON',
  'AS',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'IS',
  'IN',
  'BETWEEN',
  'LIKE',
  'HAVING',
  'DISTINCT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'UNION',
  'ALL',
  'EXISTS',
  'ANY',
  'SOME'
] as const;
