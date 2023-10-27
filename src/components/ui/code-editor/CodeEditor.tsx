interface CodeEditorProps {
  value: string;
  editable: boolean;
}

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
