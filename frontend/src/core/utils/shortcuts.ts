import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import type { ShortcutType } from '@/types';
import { KeyCode, KeyMod } from 'monaco-editor';

export const webShortcuts: { [key: string]: ShortcutType } = {
  runQuery: {
    label: locales.run,
    command: tools.isMac() ? '⌥ ↵' : 'Alt+↵',
    monaco: [KeyMod.Alt | KeyCode.Enter, KeyCode.F5],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'Enter'
  },
  newTab: {
    label: locales.new_tab,
    command: tools.isMac() ? '⌥ T' : 'Alt+T',
    monaco: [KeyMod.Alt | KeyCode.KeyT],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyT'
  },
  closeTab: {
    label: locales.close_tab,
    command: tools.isMac() ? '⌥ W' : 'Alt+W',
    monaco: [KeyMod.Alt | KeyCode.KeyW],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyW'
  },
  reloadTab: {
    label: locales.reload,
    command: tools.isMac() ? '⌥ R' : 'Alt+R',
    monaco: [KeyMod.Alt | KeyCode.KeyR],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyR'
  },
  search: {
    label: locales.search,
    command: tools.isMac() ? '⌥ F' : 'Alt+F',
    monaco: [KeyMod.Alt | KeyCode.KeyF],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyF'
  }
};

export const desktopShortcuts: { [key: string]: ShortcutType } = {
  runQuery: {
    label: locales.run,
    command: tools.isMac() ? '⌘ ↵' : 'Ctrl+↵',
    monaco: [KeyMod.CtrlCmd | KeyCode.Enter, KeyCode.F5],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.code === 'Enter'
  },
  newTab: {
    label: locales.new_tab,
    command: tools.isMac() ? '⌘ T' : 'Ctrl+T',
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyT],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.code === 'KeyT'
  },
  closeTab: {
    label: locales.close_tab,
    command: tools.isMac() ? '⌘ W' : 'Ctrl+W',
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyW],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.code === 'KeyW'
  },
  reloadTab: {
    label: locales.reload,
    command: tools.isMac() ? '⌘ R' : 'Ctrl+R',
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyR],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.code === 'KeyR'
  },
  search: {
    label: locales.search,
    command: tools.isMac() ? '⌘ F' : 'Ctrl+F',
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyF],
    shortcut: (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.code === 'KeyF'
  }
};

export let shortcuts: { [key: string]: ShortcutType } = webShortcuts;

export const switchToDesktopShortcuts = () => {
  shortcuts = desktopShortcuts;
};
