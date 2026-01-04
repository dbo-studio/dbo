import type { SqlEditorProps } from '@/components/base/SqlEditor/types.ts';
import { shortcuts } from '@/core/utils/shortcuts.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress } from '@mui/material';
import type * as Monaco from 'monaco-editor';
import { useEffect, useRef, useState, type JSX } from 'react';
import { changeMetaProviderSetting } from './helpers/dbMetaProvider.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import { setupLanguage } from './helpers/languageSetup.ts';
import { useInlineAITrigger } from './hooks/useInlineAITrigger.ts';
import { useSqlValidation } from './hooks/useSqlValidation.ts';

export default function SqlEditor({
  autocomplete,
  value,
  onChange,
  onBlur,
  onMount,
  onRunQuery
}: SqlEditorProps): JSX.Element {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const theme = useSettingStore((state) => state.theme);
  const selectedTabId = useTabStore((state) => state.selectedTabId);

  useInlineAITrigger(editor);
  useSqlValidation(editor, value);

  const handleEditorDidMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
    setEditor(editorInstance);

    editorInstance.addAction({
      id: shortcuts.runQuery.command.join('+'),
      keybindings: shortcuts.runQuery.monaco,
      run: (): void => onRunQuery(editorInstance.getValue()),
      label: shortcuts.runQuery.label
    });

    editorInstance.onDidBlurEditorText(() => {
      const currentValue = editorInstance.getValue();
      if (currentValue && currentValue !== value.toString()) {
        onBlur?.(currentValue);
      }
    });

    if (onMount) {
      onMount();
    }
  };

  const handleEditorChange = (newValue: string | undefined): void => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }
  };

  useEffect(() => {
    changeMetaProviderSetting(autocomplete);
  }, [autocomplete]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [selectedTabId]);

  return (
    <Box ref={boxRef} width='100%' height='100%'>
      <Editor
        height='100%'
        width='100%'
        theme={theme.editorTheme}
        language='sql'
        value={value}
        options={{
          ...editorConfig,
          fontSize: theme.editorFontSize
        }}
        beforeMount={setupLanguage}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        loading={
          <Box sx={{ p: 2 }}>
            <CircularProgress />
          </Box>
        }
      />
    </Box>
  );
}
