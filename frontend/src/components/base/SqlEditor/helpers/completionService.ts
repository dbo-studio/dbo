import type * as Monaco from 'monaco-editor';
import { CompletionItemInsertTextRule, CompletionItemKind, SQL_KEYWORDS } from './constants';
import { getColumns, getDataBasesAndSchemas, getTables, getViews } from './dbMetaProvider';
import { getAllTableNames, getSqlFunctions, getTableForAlias, parseSqlContext } from './sqlParser';

export const completionService = (
  model: Monaco.editor.ITextModel,
  position: Monaco.Position
): Monaco.languages.CompletionList => {
  const word = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn
  };

  const languageId = model.getLanguageId();
  const context = parseSqlContext(model, position);
  const suggestions: Monaco.languages.CompletionItem[] = [];

  const currentLineContent = model.getLineContent(position.lineNumber);
  const textBeforeCursor = currentLineContent.substring(0, position.column - 1);
  const dotMatch = textBeforeCursor.match(/([a-zA-Z0-9_]+)\.$/);

  let tableForColumns: string | null = null;
  if (dotMatch) {
    const possibleTableOrAlias = dotMatch[1];
    tableForColumns =
      getTableForAlias(model, position, possibleTableOrAlias) ||
      (context.tables.includes(possibleTableOrAlias) ? possibleTableOrAlias : null);
  }

  suggestions.push(
    ...SQL_KEYWORDS.map((keyword) => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      detail: 'Keyword',
      insertText: keyword,
      range
    }))
  );

  if (context.isInSelect || context.isInWhere || context.currentClause === 'HAVING') {
    const functions = getSqlFunctions();
    suggestions.push(
      ...functions.map((func) => ({
        label: func.label,
        kind: func.kind, // Function
        detail: func.detail,
        insertText: func.insertText,
        insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        documentation: func.detail
      }))
    );
  }

  if (context.isInFrom || context.isInJoin) {
    suggestions.push(...getDataBasesAndSchemas(languageId).map((item) => ({ ...item, range })));
    suggestions.push(...getTables(languageId).map((item) => ({ ...item, range })));
    suggestions.push(...getViews(languageId).map((item) => ({ ...item, range })));
  } else if (tableForColumns) {
    suggestions.push(...getColumns(languageId, tableForColumns).map((item) => ({ ...item, range })));
  } else if (context.isInSelect || context.isInWhere || context.isInGroupBy || context.isInOrderBy) {
    const allTables = getAllTableNames(model, position);

    if (allTables.length > 0) {
      for (const tableName of allTables) {
        const columns = getColumns(languageId, tableName);
        suggestions.push(
          ...columns.map((col) => ({
            ...col,
            range,
            label: `${tableName}.${col.label as string}`,
            insertText: `${tableName}.${col.insertText}`,
            detail: `${col.detail} from ${tableName}`
          }))
        );
      }
    } else {
      suggestions.push(...getTables(languageId).map((item) => ({ ...item, range })));
      suggestions.push(...getViews(languageId).map((item) => ({ ...item, range })));
    }
  } else {
    suggestions.push(...getTables(languageId).map((item) => ({ ...item, range })));
    suggestions.push(...getViews(languageId).map((item) => ({ ...item, range })));
  }

  return { suggestions };
};
