import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import type { ShortcutType } from '@/types';
import * as monaco from 'monaco-editor';

export const shortcuts = {
  runQuery: {
    label: locales.run,
    command: tools.isMac() ? '⌘ ↵' : 'Ctrl+↵',
    monaco: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, monaco.KeyCode.F5],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.key === 'Enter'
  } as ShortcutType
};
