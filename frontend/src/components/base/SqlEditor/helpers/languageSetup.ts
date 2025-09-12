import { shikiToMonaco } from '@shikijs/monaco';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages';

import 'monaco-sql-languages/esm/languages/mysql/mysql.contribution';
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution';

import MySQLWorker from 'monaco-sql-languages/esm/languages/mysql/mysql.worker?worker';
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker';

import { createHighlighter } from 'shiki/bundle/web';
import { completionService } from './completionService';
import { registerInlineAIProvider } from './registerInlineAIProvider';

/** define MonacoEnvironment.getWorker  */
(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string): Worker {
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker();
    }

    if (label === LanguageIdEnum.MYSQL) {
      return new MySQLWorker();
    }

    if (label === 'json') {
      return new jsonWorker();
    }

    return new editorWorker();
  }
};

if (monaco.languages.json?.jsonDefaults) {
  monaco.languages.json.jsonDefaults.setModeConfiguration({
    ...monaco.languages.json.jsonDefaults.modeConfiguration,
    completionItems: false
  });

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: false
  });
}

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['sql', 'json', 'html', 'css', 'typescript', 'javascript']
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
shikiToMonaco(highlighter, monaco);

const preprocessCode = (code: string): string => {
  const regex1 = /@@{[A-Za-z0-9._-]*}/g;
  const regex2 = /\${[A-Za-z0-9._-]*}/g;
  let result = code;

  if (regex1.test(code)) {
    result = result.replace(regex1, (str) => {
      return str.replace(/@|{|}|\.|-/g, '_');
    });
  }
  if (regex2.test(code)) {
    result = result.replace(regex2, (str) => {
      return str.replace(/\$|{|}|\.|-/g, '_');
    });
  }
  return result;
};

setupLanguageFeatures(LanguageIdEnum.PG, {
  completionItems: {
    enable: true,
    completionService
  },
  preprocessCode
});

registerInlineAIProvider(monaco, LanguageIdEnum.PG);
