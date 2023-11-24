import { sql, StandardSQL } from "@codemirror/lang-sql";
import { Theme, useTheme } from "@mui/material";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { CSSProperties } from "react";

export default function CodeEditor({
  value,
  editable = true,
}: CodeEditorProps) {
  const theme: Theme = useTheme();

  const styles: CSSProperties = {
    fontSize: theme.typography.body2.fontSize,
    fontWeight: theme.typography.fontWeightBold,
  };

  return (
    <CodeMirror
      value={value}
      role="textbox"
      style={styles}
      minHeight="100px"
      editable={editable}
      theme={githubLight}
      extensions={[sql({ dialect: StandardSQL })]}
    />
  );
}
