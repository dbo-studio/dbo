import { complete as apiComplete } from '@/api/ai';
import { useCurrentConnection } from '@/hooks';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { editor } from 'monaco-editor';
import { languages, type Position } from 'monaco-editor/esm/vs/editor/editor.api';
import { type CompletionService, EntityContextType, type ICompletionItem } from 'monaco-sql-languages/esm/main';
import { getColumns, getDataBasesAndSchemas, getTables, getViews } from './dbMetaProvider';

const haveCatalogSQLType = (languageId: string): boolean => {
  return ['flinksql', 'trinosql'].includes(languageId.toLowerCase());
};

// const namedSchemaSQLType = (languageId: string) => {
//   return ['trinosql', 'hivesql', 'sparksql', 'pgsql'].includes(languageId);
// };

export const completionService: CompletionService = async (
  model: editor.ITextModel,
  position: Position,
  _completionContext,
  suggestions
) => {
  if (!suggestions) {
    return Promise.resolve([]);
  }
  const languageId = model.getLanguageId();

  const haveCatalog = haveCatalogSQLType(languageId);
  // const getDBOrSchema = namedSchemaSQLType(languageId) ? getSchemas : getDataBases;
  const getDBOrSchema = getDataBasesAndSchemas;

  const { keywords, syntax } = suggestions;

  const keywordsCompletionItems: ICompletionItem[] = keywords.map((kw) => ({
    label: kw,
    kind: languages.CompletionItemKind.Keyword,
    detail: 'Keywords',
    sortText: `2${kw}`
  }));

  let syntaxCompletionItems: ICompletionItem[] = [];

  let existDatabaseCompletions = false;
  let existDatabaseInCatCompletions = false;
  let existTableCompletions = false;
  let existTableInDbCompletions = false;
  let existViewCompletions = false;
  let existViewInDbCompletions = false;
  let existColumnCompletions = false;
  let existColumnInTableCompletions = false;

  for (let i = 0; i < syntax.length; i++) {
    const { syntaxContextType, wordRanges } = syntax[i];
    const words = wordRanges.map((wr) => wr.text);
    const wordCount = words.length;

    if (
      syntaxContextType === EntityContextType.DATABASE ||
      syntaxContextType === EntityContextType.TABLE_CREATE ||
      syntaxContextType === EntityContextType.VIEW_CREATE
    ) {
      if (!existDatabaseCompletions && wordCount <= 1) {
        syntaxCompletionItems = syntaxCompletionItems.concat(getDBOrSchema(languageId));
        existDatabaseCompletions = true;
      }

      if (!existDatabaseInCatCompletions && haveCatalog && wordCount >= 2 && wordCount <= 3) {
        syntaxCompletionItems = syntaxCompletionItems.concat(getDBOrSchema(languageId));
        existDatabaseInCatCompletions = true;
      }
    }

    if (syntaxContextType === EntityContextType.TABLE) {
      if (wordCount <= 1) {
        if (!existDatabaseCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getDBOrSchema(languageId));
          existDatabaseCompletions = true;
        }

        if (!existTableCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getTables(languageId));
          existTableCompletions = true;
        }
      } else if (wordCount >= 2 && wordCount <= 3) {
        if (!existDatabaseInCatCompletions && haveCatalog) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getDBOrSchema(languageId));
          existDatabaseInCatCompletions = true;
        }

        if (!existTableInDbCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getTables(languageId));
          existTableInDbCompletions = true;
        }
      } else if (wordCount >= 4 && wordCount <= 5) {
        if (!existTableInDbCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getTables(languageId));
          existTableInDbCompletions = true;
        }
      }
    }

    if (syntaxContextType === EntityContextType.VIEW) {
      if (wordCount <= 1) {
        if (!existDatabaseCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getDBOrSchema(languageId));
          existDatabaseCompletions = true;
        }

        if (!existViewCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getViews(languageId));
          existViewCompletions = true;
        }
      } else if (wordCount >= 2 && wordCount <= 3) {
        if (!existDatabaseInCatCompletions && haveCatalog) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getDBOrSchema(languageId));
          existDatabaseInCatCompletions = true;
        }

        if (!existViewInDbCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getViews(languageId));
          existViewInDbCompletions = true;
        }
      } else if (wordCount >= 4 && wordCount <= 5) {
        if (!existViewInDbCompletions) {
          syntaxCompletionItems = syntaxCompletionItems.concat(getViews(languageId));
          existViewInDbCompletions = true;
        }
      }
    }

    if (syntaxContextType === EntityContextType.COLUMN || syntaxContextType === EntityContextType.FUNCTION) {
      const tableName = getCurrentTableName(model, position);

      if (!existColumnCompletions && !tableName) {
        syntaxCompletionItems = syntaxCompletionItems.concat(getColumns(languageId, undefined));
        existColumnCompletions = true;
      }

      if (!existColumnInTableCompletions && tableName) {
        syntaxCompletionItems = syntaxCompletionItems.concat(getColumns(languageId, tableName));
        existColumnInTableCompletions = true;
      }
    }
  }

  // Basic AI suggestion appended at the top
  try {
    const { settings } = useAiStore.getState();
    const currentConnection = (useCurrentConnection as any)?.();
    const textBeforeCursor = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });
    const textAfterCursor = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: model.getLineCount(),
      endColumn: model.getLineMaxColumn(model.getLineCount())
    });
    if (textBeforeCursor.trim()) {
      const ai = await apiComplete({
        connectionId: currentConnection?.id ?? 0,
        prompt: textBeforeCursor,
        suffix: textAfterCursor,
        language: languageId,
        provider: {
          providerId: 'openai-compatible',
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens
        }
      });
      if (ai.completion && ai.completion.trim()) {
        syntaxCompletionItems.unshift({
          label: ai.completion.split('\n')[0].slice(0, 64),
          insertText: ai.completion,
          kind: languages.CompletionItemKind.Snippet,
          detail: 'AI'
        } as ICompletionItem);
      }
    }
  } catch {
    // ignore
  }

  return [...syntaxCompletionItems, ...keywordsCompletionItems];
};

function getCurrentTableName(model: editor.ITextModel, position: Position): string | null {
  const currentLineContent = model.getLineContent(position.lineNumber);
  const previousLineContent = position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '';
  const sqlText = `${previousLineContent} ${currentLineContent}`;

  const tableNameRegex = /from\s+([a-zA-Z_][\w]*)/i;
  const match = tableNameRegex.exec(sqlText);

  if (match?.[1]) {
    return match[1];
  }

  return null;
}
