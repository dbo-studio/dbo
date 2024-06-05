import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { EditorView } from '@uiw/react-codemirror';
import BaseEditor from './BaseEditor';
import { CodeEditorProps } from './types';

export default function CodeEditor({ autocomplete, value, onChange }: CodeEditorProps) {
  const styleTheme = EditorView.baseTheme({
    '&.cm-editor.cm-focused': {
      outline: 'unset'
    }
  });

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
        styleTheme
        // Prec.highest(
        //   keymap.of([
        //     {
        //       key: 'Tab',
        //       run: () => {
        //         return true;
        //       }
        //     }
        //   ])
        // )
      ]}
    />
  );
}
