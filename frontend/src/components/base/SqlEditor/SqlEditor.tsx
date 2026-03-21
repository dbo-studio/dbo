import type { SqlEditorProps, SqlEditorRef } from '@/components/base/SqlEditor/types.ts';
import { shortcuts } from '@/core/utils/shortcuts.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import Editor, { useMonaco, type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress } from '@mui/material';
import type * as Monaco from 'monaco-editor';
import { forwardRef, useEffect, useImperativeHandle, useRef, type JSX } from 'react';
import { changeMetaProviderSetting } from './helpers/dbMetaProvider.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import { setupLanguage } from './helpers/languageSetup.ts';
import { useInlineAITrigger } from './hooks/useInlineAITrigger.ts';
import { useSqlValidation } from './hooks/useSqlValidation.ts';

//todo: should check performance of realtime text selection monitor and use forward ref
export default forwardRef<SqlEditorRef, SqlEditorProps>(function SqlEditor(
  { autocomplete, value, onChange, onBlur, onMount, onRunQuery }: SqlEditorProps,
  ref
): JSX.Element {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor>(null);
  const theme = useSettingStore((state) => state.theme);
  const monaco = useMonaco();
  const selectedTabId = useTabStore((state) => state.selectedTabId);

  useInlineAITrigger(editorRef.current);
  useSqlValidation(editorRef.current, value);

  const handleEditorDidMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;

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

  useImperativeHandle(ref, () => ({
    getSelectedQuery: (): string | undefined => {
      const editor = editorRef.current;
      if (!editor) return undefined;

      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        return editor.getModel()?.getValueInRange(selection);
      }
      return editor.getValue();
    }
  }));

  useEffect(() => {
    changeMetaProviderSetting(autocomplete);
  }, [autocomplete]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [selectedTabId]);

  useEffect(() => {
    if (monaco) {
      void (async () => {
        await setupLanguage(monaco, theme.editorTheme);
      })();
    }
  }, [monaco, theme.editorTheme]);

  return (
    <Box width='100%' height='100%'>
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
});
