import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Theme, useTheme } from '@mui/material';
import { githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror from '@uiw/react-codemirror';
import { CSSProperties } from 'react';
import { BaseEditorProps } from './types';

export default function BaseEditor(props: BaseEditorProps) {
  const theme: Theme = useTheme();

  const styles: CSSProperties = {
    fontSize: theme.typography.body2.fontSize,
    fontWeight: theme.typography.fontWeightBold,
    height: '100%'
  };

  return (
    <CodeMirror
      role='textbox'
      style={styles}
      theme={githubLight}
      basicSetup={{
        foldGutter: true,
        highlightActiveLine: true,
        syntaxHighlighting: true,
        autocompletion: true,
        highlightSelectionMatches: true,
        searchKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
        historyKeymap: true,
        tabSize: 4
      }}
      extensions={[sql({ dialect: PostgreSQL, upperCaseKeywords: true })]}
      {...props}
    />
  );
}
