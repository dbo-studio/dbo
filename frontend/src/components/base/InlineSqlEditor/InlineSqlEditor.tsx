import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { ColumnType } from '@/types';
import Editor, { useMonaco, type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress } from '@mui/material';
import { KeyCode } from 'monaco-editor';
import { useEffect, type JSX } from 'react';
import { setConditionContext } from './helpers/dbMetaProvider';
import { inlineEditorConfig } from './helpers/editorConfig';
import { setupLanguage } from './helpers/languageSetup';
import { InlineSqlEditorStyled } from './InlineSqlEditor.styled';

type ConditionSqlEditorProps = {
  columns: ColumnType[];
  placeholder: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onEnter?: (value: string) => void;
};

export default function InlineSqlEditor({
  columns,
  placeholder,
  value,
  onChange,
  onBlur,
  onEnter
}: ConditionSqlEditorProps): JSX.Element {
  const monaco = useMonaco();
  const theme = useSettingStore((state) => state.theme);

  useEffect(() => {
    setConditionContext(columns);

    return () => {
      setConditionContext(undefined);
    };
  }, [columns]);

  useEffect(() => {
    if (monaco) {
      void (async () => {
        await setupLanguage(monaco, theme.editorTheme);
      })();
    }
  }, [monaco, theme.editorTheme]);

  const handleEditorDidMount: OnMount = (editorInstance) => {
    editorInstance.addCommand(
      KeyCode.Enter,
      () => {
        onEnter?.(editorInstance.getValue());
      },
      '!suggestWidgetVisible'
    );

    editorInstance.onDidBlurEditorText(() => {
      const currentValue = editorInstance.getValue();
      if (currentValue && currentValue !== value.toString()) {
        onBlur?.(currentValue);
      }
    });
  };

  return (
    <InlineSqlEditorStyled>
      <Editor
        height='100%'
        width='100%'
        theme={theme.editorTheme}
        language='sql'
        value={value}
        options={{
          ...inlineEditorConfig,
          placeholder: placeholder
        }}
        onMount={handleEditorDidMount}
        onChange={(v) => onChange?.(v ?? '')}
        loading={
          <Box sx={{ p: 2 }}>
            <CircularProgress />
          </Box>
        }
      />
    </InlineSqlEditorStyled>
  );
}
