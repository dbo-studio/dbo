import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import type { ShortcutType } from '@/types';
import * as monaco from 'monaco-editor';

export const shortcuts: { [key: string]: ShortcutType } = {
  runQuery: {
    label: locales.run,
    command: tools.isMac() ? '⌥ ↵' : 'Alt+↵',
    monaco: [monaco.KeyMod.Alt | monaco.KeyCode.Enter, monaco.KeyCode.F5],
    shortcut: (event: KeyboardEvent) => event.altKey && event.key === 'Enter'
  },
  newTab: {
    label: locales.new_tab,
    command: tools.isMac() ? '⌥ T' : 'Alt+T',
    monaco: [monaco.KeyMod.Alt | monaco.KeyCode.KeyT],
    shortcut: (event: KeyboardEvent) => event.altKey && event.key === '†'
  },
  closeTab: {
    label: locales.close_tab,
    command: tools.isMac() ? '⌥ W' : 'Alt+W',
    monaco: [monaco.KeyMod.Alt | monaco.KeyCode.KeyW],
    shortcut: (event: KeyboardEvent) => event.altKey && event.key === '∑'
  },
  reloadTab: {
    label: locales.reload,
    command: tools.isMac() ? '⌥ R' : 'Alt+R',
    monaco: [monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
    shortcut: (event: KeyboardEvent) => event.altKey && event.key === '®'
  }
};
