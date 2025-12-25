import type { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Box } from '@mui/material';
import * as monaco from 'monaco-editor';
import { type JSX, useEffect, useRef } from 'react';
import { editorConfig } from './helpers/editorConfig.ts';

export default function CodeEditor({ value, onChange, width, height }: CodeEditorProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const theme = useSettingStore((state) => state.theme);

  useEffect(() => {
    if (hostRef.current && !editorRef.current) {
      editorRef.current = monaco.editor.create(hostRef.current, {
        ...editorConfig,
        theme: theme.editorTheme,
        fontSize: theme.editorFontSize,
        language: 'json'
      });
    }

    const model = editorRef.current?.getModel();

    model?.onDidChangeContent(() => {
      if (value.toString() !== model.getValue().trimStart()) {
        onChange(model.getValue().trimStart());
      }
    });

    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    if (value && editorRef.current && value.toString() !== editorRef.current.getValue()) {
      editorRef.current.setValue(value.toString());
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        theme: theme.editorTheme,
        fontSize: theme.editorFontSize
      });
    }
  }, [theme.editorTheme, theme.editorFontSize]);

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
