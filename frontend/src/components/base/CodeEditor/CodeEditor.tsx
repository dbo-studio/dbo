import type { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import { getEditorFontFamily } from '@/core/fonts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Editor, useMonaco } from '@monaco-editor/react';
import { type JSX, useCallback, useEffect } from 'react';
import { CodeEditorBoxStyled } from './CodeEditor.styled.ts';
import { editorConfig } from './helpers/editorConfig.ts';
import { setupLanguage } from './helpers/languageSetup.ts';

export default function CodeEditor({
  value,
  onChange,
  width,
  height,
  language = 'json',
  editable = true
}: CodeEditorProps): JSX.Element {
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
        language={language}
        value={value}
        onChange={handleEditorChange}
        theme={theme.editorTheme}
        options={{
          ...editorConfig,
          readOnly: !editable,
          fontSize: theme.editorFontSize,
          fontFamily: getEditorFontFamily(theme.editorFont)
        }}
      />
    </CodeEditorBoxStyled>
  );
}
