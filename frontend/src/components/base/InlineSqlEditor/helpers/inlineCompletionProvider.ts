import type * as Monaco from 'monaco-editor';
import { CompletionItemKind, SQL_KEYWORDS } from '../../SqlEditor/helpers/constants';
import { getColumns } from './dbMetaProvider';

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
  const suggestions: Monaco.languages.CompletionItem[] = [];

  suggestions.push(
    ...getColumns(languageId).map((item) => ({
      ...item,
      range
    }))
  );

  suggestions.push(
    ...SQL_KEYWORDS.map((keyword) => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      detail: 'Keyword',
      insertText: keyword,
      range
    }))
  );

  return { suggestions };
};
