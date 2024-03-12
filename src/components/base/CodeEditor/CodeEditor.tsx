import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Theme, useTheme } from '@mui/material';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import { CSSProperties } from 'react';
import { CodeEditorProps } from './types';

export default function CodeEditor(props: CodeEditorProps) {
  const theme: Theme = useTheme();

  const styles: CSSProperties = {
    fontSize: theme.typography.body2.fontSize,
    fontWeight: theme.typography.fontWeightBold
  };

  return (
    <CodeMirror
      role='textbox'
      style={styles}
      theme={githubLight}
      extensions={[sql({ dialect: PostgreSQL, upperCaseKeywords: true })]}
      {...props}
    />
  );
}
