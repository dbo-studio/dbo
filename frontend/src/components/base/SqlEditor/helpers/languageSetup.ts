import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages';


import { shikiToMonaco } from '@shikijs/monaco';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker';
import { createHighlighter } from 'shiki';
import { completionService } from './completionService';

/** define MonacoEnvironment.getWorker  */
(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker();
    }

    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

monaco.languages.json.jsonDefaults.setModeConfiguration({
  ...monaco.languages.json.jsonDefaults.modeConfiguration,
  completionItems: false
});

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  validate: false
});

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
