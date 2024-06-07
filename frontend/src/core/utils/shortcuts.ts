import { ShortcutType } from '@/src/types';
import { tools } from '@/utils/tools';

export const shortcuts = {
  runQuery: {
    command: tools.isMac() ? `⌘ ↵` : `Ctrl+↵`,
    codemirror: tools.isMac() ? `Cmd-Enter` : `Ctrl-Enter`,
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.key === 'Enter'
  } as ShortcutType
};
