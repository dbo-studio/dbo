import { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import * as monaco from 'monaco-editor';
import { LanguageIdEnum } from 'monaco-sql-languages';

import { useEffect, useRef } from 'react';
import { changeMetaProviderSetting } from './helpers/dbMetaProvider.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import './helpers/languageSetup.ts';

export default function CodeEditor({ autocomplete, value, onChange }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(hostRef.current, {
        ...editorConfig,
        language: LanguageIdEnum.PG
      });
    }

    const model = editorRef.current?.getModel();
    model?.onDidChangeContent(() => {
      onChange(JSON.stringify(model.getValue()));
    });
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      let v = value ?? '';
      try {
        v = JSON.parse(v);
      } catch (error) {
        console.log('🚀 ~ useEffect ~ error:', error);
      }

      editorRef.current.setValue(v);
    }
  }, [value]);

  useEffect(() => {
    changeMetaProviderSetting(autocomplete);
  }, [autocomplete]);

  return <div style={{ height: '100%', width: '100%' }} ref={hostRef}></div>;
}
