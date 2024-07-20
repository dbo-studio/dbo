import { editor } from 'monaco-editor';

export const editorConfig: editor.IStandaloneEditorConstructionOptions = {
  theme: 'sql-light',
  tabSize: 4,
  renderValidationDecorations: 'on',
  accessibilitySupport: 'off',
  insertSpaces: true,
  autoClosingQuotes: 'always',
  detectIndentation: false,
  folding: false,
  automaticLayout: true,
  minimap: {
    enabled: false
  },
  wordWrap: 'on',
  fixedOverflowWidgets: true,
  scrollBeyondLastLine: false,
  suggestFontSize: 12,
  padding: {
    top: 8,
    bottom: 8
  },
  renderLineHighlight: 'none',
  codeLens: false,
  scrollbar: {
    alwaysConsumeMouseWheel: false
  },
  fontSize: 14,
  fontWeight: 'medium',
  wordBasedSuggestions: 'off',
  quickSuggestions: false
};
