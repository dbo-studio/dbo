import { tools } from '@/core/utils/tools';
import { ShortcutType } from '@/types';

export const shortcuts = {
  runQuery: {
    command: tools.isMac() ? `⌘ ↵` : `Ctrl+↵`,
    codemirror: tools.isMac() ? `Cmd-Enter` : `Ctrl-Enter`,
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.key === 'Enter'
  } as ShortcutType
};
