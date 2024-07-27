import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages';

import { shikiToMonaco } from '@shikijs/monaco';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker';
import { createHighlighter } from 'shiki';
import { completionService } from './completionService';

/** define MonacoEnvironment.getWorker  */
(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker();
    }
    return new EditorWorker();
  }
};

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: ['sql']
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
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
