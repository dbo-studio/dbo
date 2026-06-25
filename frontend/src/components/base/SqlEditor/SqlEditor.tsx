import type { SqlEditorProps, SqlEditorRef } from '@/components/base/SqlEditor/types.ts';
import { shortcuts } from '@/core/utils/shortcuts.ts';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import Editor, { useMonaco, type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress } from '@mui/material';
import type * as Monaco from 'monaco-editor';
import { useEffect, useImperativeHandle, useRef, type JSX } from 'react';
import { changeMetaProviderSetting } from './helpers/dbMetaProvider.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import { setupLanguage } from './helpers/languageSetup.ts';
import { useInlineAITrigger } from './hooks/useInlineAITrigger.ts';
import { useSqlValidation } from './hooks/useSqlValidation.ts';

export default function SqlEditor({
  ref,
  autocomplete,
  value,
  onChange,
  onBlur,
  onMount,
  onRunQuery,
  onAiSelection
}: SqlEditorProps & { ref?: React.RefObject<SqlEditorRef | null> }): JSX.Element {
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

    if (onAiSelection) {
      const registerAiAction = (id: string, label: string, action: 'explain' | 'optimize' | 'fix') => {
        editorInstance.addAction({
          id,
          label,
          contextMenuGroupId: 'ai',
          contextMenuOrder: action === 'explain' ? 1 : action === 'optimize' ? 2 : 3,
          run: (ed): void => {
            const selection = ed.getSelection();
            const sql = selection && !selection.isEmpty() ? ed.getModel()?.getValueInRange(selection) : ed.getValue();
            if (sql) {
              onAiSelection(sql, action);
            }
          }
        });
      };

      registerAiAction('ai-explain-selection', locales.ai_explain_selection, 'explain');
      registerAiAction('ai-optimize-selection', locales.ai_optimize_selection, 'optimize');
      registerAiAction('ai-fix-selection', locales.ai_fix_selection, 'fix');
    }

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
    <Box
      sx={{
        width: '100%',
        height: '100%'
      }}
    >
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
}
