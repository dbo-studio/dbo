import type { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Editor, useMonaco } from '@monaco-editor/react';
import { type JSX, useCallback, useEffect } from 'react';
import { CodeEditorBoxStyled } from './CodeEditor.styled.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import { setupLanguage } from './helpers/languageSetup.ts';

export default function CodeEditor({ value, onChange, width, height }: CodeEditorProps): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const monaco = useMonaco();

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange]
  );

  useEffect(() => {
    if (monaco) {
      void (async () => {
        await setupLanguage(monaco, theme.editorTheme);
      })();
    }
  }, [monaco, theme.editorTheme]);

  return (
    <CodeEditorBoxStyled width={width} height={height}>
      <Editor
        height={height || '100%'}
        width={width || '100%'}
        language='json'
        value={value}
        onChange={handleEditorChange}
        theme={theme.editorTheme}
        options={{
          ...editorConfig,
          fontSize: theme.editorFontSize
        }}
      />
    </CodeEditorBoxStyled>
  );
}
