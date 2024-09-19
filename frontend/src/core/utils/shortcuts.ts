import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import type { ShortcutType } from '@/types';
import * as monaco from 'monaco-editor';

export const shortcuts: { [key: string]: ShortcutType } = {
  runQuery: {
    label: locales.run,
    command: tools.isMac() ? '⌘ ↵' : 'Ctrl+↵',
    monaco: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, monaco.KeyCode.F5],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.key === 'Enter'
  },
  newTab: {
    label: locales.new_tab,
    command: tools.isMac() ? '⌥ T' : 'Alt+T',
    monaco: [monaco.KeyMod.Alt | monaco.KeyCode.KeyT],
    shortcut: (event: KeyboardEvent) => event.altKey && event.key === '†'
  },
  closeTab: {
    label: locales.close_tab,
    command: tools.isMac() ? '⌘ ⇧ W' : 'Alt+W',
    monaco: [monaco.KeyMod.Alt | monaco.KeyCode.KeyW],
    shortcut: (event: KeyboardEvent) => event.altKey && event.key === '∑'
  }
};
