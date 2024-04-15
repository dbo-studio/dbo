import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { EditorView } from '@uiw/react-codemirror';
import BaseEditor from './BaseEditor';
import { CodeEditorProps } from './types';

export default function CodeEditor(props: CodeEditorProps) {
  const styleTheme = EditorView.baseTheme({
    '&.cm-editor.cm-focused': {
      outline: 'unset'
    }
  });

  return (
    <BaseEditor
      height='100%'
      extensions={[
        sql({
          dialect: PostgreSQL,
          upperCaseKeywords: true,
          schema: {
            addons: ['id', 'user_id']
          }
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
      autoFocus={true}
      value={props.value}
      onChange={props.onChange}
      editable={true}
    />
  );
}
