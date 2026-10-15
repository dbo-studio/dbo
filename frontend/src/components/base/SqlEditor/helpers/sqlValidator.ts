import type * as Monaco from 'monaco-editor';
import { MarkerSeverity } from './constants';

export type SqlValidationError = {
  message: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  length: number;
};

export function validateSql(text: string): SqlValidationError[] {
  const errors: SqlValidationError[] = [];
  const lines = text.split('\n');

  const normalizedText = text
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  if (normalizedText.length === 0) {
    return errors;
  }

  let singleQuoteCount = 0;
  let doubleQuoteCount = 0;
  let backtickCount = 0;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const prevChar = i > 0 ? normalizedText[i - 1] : '';

    if (prevChar === '\\') {
      continue;
    }

    if (char === "'") {
      singleQuoteCount++;
    } else if (char === '"') {
      doubleQuoteCount++;
    } else if (char === '`') {
      backtickCount++;
    }
  }

  let parenCount = 0;
  let bracketCount = 0;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
  }

  if (singleQuoteCount % 2 !== 0) {
    const lastQuoteIndex = normalizedText.lastIndexOf("'");
    const line = text.substring(0, lastQuoteIndex).split('\n').length;
    const column = lines[line - 1]?.lastIndexOf("'") ?? 0;
    errors.push({
      message: 'Unmatched single quote',
      severity: 'error',
      line,
      column: column + 1,
      length: 1
    });
  }

  if (doubleQuoteCount % 2 !== 0) {
    const lastQuoteIndex = normalizedText.lastIndexOf('"');
    const line = text.substring(0, lastQuoteIndex).split('\n').length;
    const column = lines[line - 1]?.lastIndexOf('"') ?? 0;
    errors.push({
      message: 'Unmatched double quote',
      severity: 'error',
      line,
      column: column + 1,
      length: 1
    });
  }

  if (backtickCount % 2 !== 0) {
    const lastBacktickIndex = normalizedText.lastIndexOf('`');
    const line = text.substring(0, lastBacktickIndex).split('\n').length;
    const column = lines[line - 1]?.lastIndexOf('`') ?? 0;
    errors.push({
      message: 'Unmatched backtick',
      severity: 'error',
      line,
      column: column + 1,
      length: 1
    });
  }

  if (parenCount !== 0) {
    const line = text.split('\n').length;
    errors.push({
      message: parenCount > 0 ? 'Unmatched opening parenthesis' : 'Unmatched closing parenthesis',
      severity: 'error',
      line,
      column: 1,
      length: 1
    });
  }

  if (bracketCount !== 0) {
    const line = text.split('\n').length;
    errors.push({
      message: bracketCount > 0 ? 'Unmatched opening bracket' : 'Unmatched closing bracket',
      severity: 'error',
      line,
      column: 1,
      length: 1
    });
  }

  const upperText = normalizedText.toUpperCase();

  if (upperText.includes('SELECT') && !upperText.includes('FROM') && !upperText.match(/SELECT\s+[\w\s,()]+FROM/)) {
    const selectIndex = upperText.indexOf('SELECT');
    const line = normalizedText.substring(0, selectIndex).split('\n').length;
    const column = lines[line - 1]?.indexOf('SELECT') ?? 0;

    if (normalizedText.substring(selectIndex + 6).trim().length > 0) {
      errors.push({
        message: 'SELECT statement missing FROM clause',
        severity: 'warning',
        line,
        column: column + 1,
        length: 6
      });
    }
  }

  const keywordPatterns = [
    { pattern: /\bFROM\s+FROM\b/i, message: 'Duplicate FROM keyword', severity: 'error' as const },
    { pattern: /\bWHERE\s+WHERE\b/i, message: 'Duplicate WHERE keyword', severity: 'error' as const },
    { pattern: /\bSELECT\s+SELECT\b/i, message: 'Duplicate SELECT keyword', severity: 'error' as const }
  ];

  for (const { pattern, message, severity } of keywordPatterns) {
    const match = pattern.exec(normalizedText);
    if (match) {
      const line = normalizedText.substring(0, match.index).split('\n').length;
      const column = lines[line - 1]?.indexOf(match[0]) ?? 0;
      errors.push({
        message,
        severity,
        line,
        column: column + 1,
        length: match[0].length
      });
    }
  }

  return errors;
}

export function errorsToMarkers(errors: SqlValidationError[]): Monaco.editor.IMarkerData[] {
  return errors.map((error) => ({
    message: error.message,
    severity:
      error.severity === 'error'
        ? MarkerSeverity.Error
        : error.severity === 'warning'
          ? MarkerSeverity.Warning
          : MarkerSeverity.Info,
    startLineNumber: error.line,
    startColumn: error.column,
    endLineNumber: error.line,
    endColumn: error.column + error.length,
    source: 'SQL Validator'
  }));
}
