import { type Position, languages } from 'monaco-editor/esm/vs/editor/editor.api';
import { type CompletionService, EntityContextType, type ICompletionItem } from 'monaco-sql-languages/esm/main';

import type { editor } from 'monaco-editor';
import { getColumns, getDataBasesAndSchemas, getTables, getViews } from './dbMetaProvider';

const haveCatalogSQLType = (languageId: string) => {
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
