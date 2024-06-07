import { shortcuts } from '@/core/utils';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { EditorView, Prec, keymap } from '@uiw/react-codemirror';
import { useMemo } from 'react';
import BaseEditor from './BaseEditor';
import { CodeEditorProps } from './types';

export default function CodeEditor({ autocomplete, value, onChange }: CodeEditorProps) {
  const styleTheme = EditorView.baseTheme({
    '&.cm-editor.cm-focused': {
      outline: 'unset'
    }
  });

  const k = useMemo(() => {
    return Object.keys(shortcuts).map((key) => ({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      key: shortcuts[key].codemirror,
      run: () => {
        return true;
      }
    }));
  }, [shortcuts]);

  return (
    <BaseEditor
      height='100%'
      autoFocus={true}
      value={value}
      onChange={onChange}
      editable={true}
      extensions={[
        sql({
          dialect: PostgreSQL,
          upperCaseKeywords: true,
          schema: autocomplete
        }),
        styleTheme,
        Prec.highest(keymap.of(k))
      ]}
    />
  );
}
