import * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { LanguageIdEnum, setupLanguageFeatures, vsPlusTheme } from 'monaco-sql-languages';
import { useEffect, useRef } from 'react';
import { completionService } from './helpers/completionService.ts';
import './languageSetup.ts';

export default function CodeEditorV2(props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editor.defineTheme('sql-light', vsPlusTheme.lightThemeData);

      editorRef.current = monaco.editor.create(hostRef.current, {
        language: LanguageIdEnum.PG,
        theme: 'sql-light'
      });
    }
  }, []);

  setupLanguageFeatures(LanguageIdEnum.PG, {
    completionItems: {
      enable: true,
      completionService
    },
    preprocessCode
  });

  return <div style={{ width: '100vw', height: '100vh' }} ref={hostRef}></div>;
}

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
