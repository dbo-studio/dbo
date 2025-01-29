import type { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Box } from '@mui/material';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { editorConfig } from './helpers/editorConfig.ts';

export default function CodeEditor({ value, onChange, width, height }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const { isDark } = useSettingStore();

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(hostRef.current, {
        ...editorConfig,
        theme: isDark ? 'github-dark' : 'github-light',
        language: 'json'
      });
    }

    const model = editorRef.current?.getModel();

    model?.onDidChangeContent(() => {
      if (value.toString() !== model.getValue()) {
        onChange(model.getValue());
      }
    });
  }, []);

  useEffect(() => {
    if (editorRef.current && value.toString() !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        theme: isDark ? 'github-dark' : 'github-light'
      });
    }
  }, [isDark]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [width, height]);

  return (
    <Box
      sx={{
        width: '100%',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        msUserSelect: 'text',
        '& *': {
          userSelect: 'text',
          WebkitUserSelect: 'text',
          msUserSelect: 'text'
        }
      }}
      ref={hostRef}
    />
  );
}
