import { CodeEditorProps } from '@/components/base/CodeEditorV2/types.ts';
import * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { LanguageIdEnum, setupLanguageFeatures, vsPlusTheme } from 'monaco-sql-languages';
import { useEffect, useRef } from 'react';
import { completionService } from './helpers/completionService.ts';
import './helpers/languageSetup.ts';

export default function CodeEditorV2({ value, onChange }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editor.defineTheme('sql-light', vsPlusTheme.lightThemeData);

      editorRef.current = monaco.editor.create(hostRef.current, {
        language: LanguageIdEnum.PG,
        theme: 'sql-light',
        value: value,
        tabSize: 4,
        renderValidationDecorations: 'on',
        accessibilitySupport: 'off',
        insertSpaces: true,
        autoClosingQuotes: 'always',
        detectIndentation: false,
        folding: false,
        automaticLayout: true,
        minimap: {
          enabled: false
        },
        wordWrap: 'on',
        fixedOverflowWidgets: true,
        scrollBeyondLastLine: false,
        suggestFontSize: 12,
        padding: {
          top: 8,
          bottom: 8
        },
        renderLineHighlight: 'none',
        codeLens: false,
        scrollbar: {
          alwaysConsumeMouseWheel: false
        },
        fontSize: 14,
        fontWeight: 'medium'
      });
    }

    const model = editorRef.current?.getModel();
    model?.onDidChangeContent(() => {
      onChange(model.getValue());
    });
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