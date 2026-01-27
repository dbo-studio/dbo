import type { CodeEditorProps } from '@/components/base/CodeEditor/types.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import MonacoEditor from '@monaco-editor/react';
import { Box } from '@mui/material';
import { type JSX, useCallback } from 'react';
import { editorConfig } from './helpers/editorConfig.ts';

export default function CodeEditor({ value, onChange, width, height }: CodeEditorProps): JSX.Element {
  const theme = useSettingStore((state) => state.theme);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  return (
    <Box
      sx={{
        width: width || '100%',
        height: height || '100%',
        '& .monaco-editor, .monaco-editor .margin': {
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MsUserSelect: 'text'
        }
      }}
    >
      <MonacoEditor
        height={height || '100%'}
        width={width || '100%'}
        language="json"
        value={value}
        onChange={handleEditorChange}
        theme={theme.editorTheme}
        options={{
          ...editorConfig,
        }}
      />
    </Box>
  );
}