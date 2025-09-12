import type { editor } from 'monaco-editor';

export const editorConfig: editor.IStandaloneEditorConstructionOptions = {
  tabSize: 4,
  renderValidationDecorations: 'on',
  accessibilitySupport: 'off',
  insertSpaces: true,
  autoClosingQuotes: 'always',
  detectIndentation: false,
  folding: false,
  automaticLayout: true,
  contextmenu: false,
  // Disable auto suggestion widget; require manual trigger (e.g., Ctrl+Space)
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  acceptSuggestionOnEnter: 'smart',
  tabCompletion: 'off',
  parameterHints: { enabled: false },
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
  fontWeight: 'bold',
  fontFamily: 'JetBrainsMono-Bold',
  inlineSuggest: { enabled: true, mode: 'prefix' }
};
