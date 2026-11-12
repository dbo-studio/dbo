import type { editor } from 'monaco-editor';
import { editorConfig } from '../../SqlEditor/helpers/editorConfig';

export const inlineEditorConfig: editor.IStandaloneEditorConstructionOptions = {
  ...editorConfig,
  lineNumbers: 'off',
  wordWrap: 'off',
  inlineSuggest: { enabled: false },
  // Monaco's menu would be clipped by the 20px box and lists editor-only commands.
  contextmenu: false,
  // One 20px line fills the 20px box exactly; any vertical padding makes the
  // content taller than the box, so clicks and wheel scroll the text out of view.
  padding: {
    top: 0,
    bottom: 0
  },
  fontSize: 13,
  lineHeight: 20,
  scrollbar: {
    ...editorConfig.scrollbar,
    vertical: 'hidden',
    horizontal: 'hidden'
  },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  tabCompletion: 'off'
};
