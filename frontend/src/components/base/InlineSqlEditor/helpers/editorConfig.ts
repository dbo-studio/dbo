import type { editor } from 'monaco-editor';
import { editorConfig } from '../../SqlEditor/helpers/editorConfig';

export const inlineEditorConfig: editor.IStandaloneEditorConstructionOptions = {
  ...editorConfig,
  lineNumbers: 'off',
  wordWrap: 'off',
  inlineSuggest: { enabled: false },
  padding: {
    top: 1,
    bottom: 4
  },
  fontSize: 12,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  tabCompletion: 'off'
};
