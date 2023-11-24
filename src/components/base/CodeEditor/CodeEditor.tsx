import { sql, StandardSQL } from "@codemirror/lang-sql";
import { githubLight } from "@uiw/codemirror-theme-github";
import { CodeMirrorStyled } from "./CodeEditor.styled";

export default function CodeEditor({
  value,
  editable = true,
}: CodeEditorProps) {
  return (
    <CodeMirrorStyled
      value={value}
      role="textbox"
      minHeight="100px"
      editable={editable}
      theme={githubLight}
      extensions={[sql({ dialect: StandardSQL })]}
    />
  );
}
