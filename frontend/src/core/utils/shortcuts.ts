import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import type { ShortcutType } from '@/types';
import { KeyCode, KeyMod } from 'monaco-editor';

const modKey = (): string => (tools.isMac() ? '⌘' : 'Ctrl');
const altKey = (): string => (tools.isMac() ? '⌥' : 'Alt');
const shiftKey = (): string => (tools.isMac() ? '⇧' : 'Shift');

const isMod = (event: KeyboardEvent): boolean => event.ctrlKey || event.metaKey;

export const webShortcuts: { [key: string]: ShortcutType } = {
  runQuery: {
    id: 'runQuery',
    group: 'editor',
    label: locales.run,
    command: [altKey(), '↵'],
    monaco: [KeyMod.Alt | KeyCode.Enter, KeyCode.F5],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'Enter'
  },
  formatSql: {
    id: 'formatSql',
    group: 'editor',
    label: locales.format,
    command: [altKey(), shiftKey(), 'F'],
    monaco: [KeyMod.Alt | KeyMod.Shift | KeyCode.KeyF],
    shortcut: (event: KeyboardEvent) => event.altKey && event.shiftKey && event.code === 'KeyF'
  },
  cancelQuery: {
    id: 'cancelQuery',
    group: 'editor',
    label: locales.stop_query,
    command: ['Esc'],
    monaco: [KeyCode.Escape],
    shortcut: (event: KeyboardEvent) => event.code === 'Escape'
  },
  newTab: {
    id: 'newTab',
    group: 'tabs',
    label: locales.new_tab,
    command: [altKey(), 'T'],
    monaco: [KeyMod.Alt | KeyCode.KeyT],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyT'
  },
  closeTab: {
    id: 'closeTab',
    group: 'tabs',
    label: locales.close_tab,
    command: [altKey(), 'W'],
    monaco: [KeyMod.Alt | KeyCode.KeyW],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyW'
  },
  reloadTab: {
    id: 'reloadTab',
    group: 'grid',
    label: locales.refresh,
    command: [altKey(), 'R'],
    monaco: [KeyMod.Alt | KeyCode.KeyR],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyR'
  },
  saveGrid: {
    id: 'saveGrid',
    group: 'grid',
    label: locales.save,
    command: [altKey(), 'S'],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyS'
  },
  addRow: {
    id: 'addRow',
    group: 'grid',
    label: locales.add_row,
    command: [altKey(), 'N'],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyN'
  },
  discardChanges: {
    id: 'discardChanges',
    group: 'grid',
    label: locales.discard_changes,
    command: [altKey(), shiftKey(), 'D'],
    shortcut: (event: KeyboardEvent) => event.altKey && event.shiftKey && event.code === 'KeyD'
  },
  search: {
    id: 'search',
    group: 'grid',
    label: locales.search,
    command: [altKey(), 'F'],
    monaco: [KeyMod.Alt | KeyCode.KeyF],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyF'
  },
  openAssistant: {
    id: 'openAssistant',
    group: 'app',
    label: locales.open_assistant,
    command: [altKey(), 'A'],
    monaco: [KeyMod.Alt | KeyCode.KeyA],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'KeyA'
  },
  openShortcuts: {
    id: 'openShortcuts',
    group: 'app',
    label: locales.keyboard_shortcuts,
    command: [altKey(), '/'],
    shortcut: (event: KeyboardEvent) => event.altKey && event.code === 'Slash'
  }
};

export const desktopShortcuts: { [key: string]: ShortcutType } = {
  runQuery: {
    id: 'runQuery',
    group: 'editor',
    label: locales.run,
    command: [modKey(), '↵'],
    monaco: [KeyMod.CtrlCmd | KeyCode.Enter, KeyCode.F5],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'Enter'
  },
  formatSql: {
    id: 'formatSql',
    group: 'editor',
    label: locales.format,
    command: [modKey(), shiftKey(), 'F'],
    monaco: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.shiftKey && event.code === 'KeyF'
  },
  cancelQuery: {
    id: 'cancelQuery',
    group: 'editor',
    label: locales.stop_query,
    command: ['Esc'],
    monaco: [KeyCode.Escape],
    shortcut: (event: KeyboardEvent) => event.code === 'Escape'
  },
  newTab: {
    id: 'newTab',
    group: 'tabs',
    label: locales.new_tab,
    command: [modKey(), 'T'],
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyT],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'KeyT'
  },
  closeTab: {
    id: 'closeTab',
    group: 'tabs',
    label: locales.close_tab,
    command: [modKey(), 'W'],
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyW],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'KeyW'
  },
  reloadTab: {
    id: 'reloadTab',
    group: 'grid',
    label: locales.refresh,
    command: [modKey(), 'R'],
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyR],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'KeyR'
  },
  saveGrid: {
    id: 'saveGrid',
    group: 'grid',
    label: locales.save,
    command: [modKey(), 'S'],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'KeyS'
  },
  addRow: {
    id: 'addRow',
    group: 'grid',
    label: locales.add_row,
    command: [modKey(), shiftKey(), 'N'],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.shiftKey && event.code === 'KeyN'
  },
  discardChanges: {
    id: 'discardChanges',
    group: 'grid',
    label: locales.discard_changes,
    command: [modKey(), shiftKey(), 'D'],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.shiftKey && event.code === 'KeyD'
  },
  search: {
    id: 'search',
    group: 'grid',
    label: locales.search,
    command: [modKey(), 'F'],
    monaco: [KeyMod.CtrlCmd | KeyCode.KeyF],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'KeyF'
  },
  openAssistant: {
    id: 'openAssistant',
    group: 'app',
    label: locales.open_assistant,
    command: [modKey(), shiftKey(), 'A'],
    monaco: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyA],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.shiftKey && event.code === 'KeyA'
  },
  openShortcuts: {
    id: 'openShortcuts',
    group: 'app',
    label: locales.keyboard_shortcuts,
    command: [modKey(), '/'],
    shortcut: (event: KeyboardEvent) => isMod(event) && event.code === 'Slash'
  }
};

export let shortcuts: { [key: string]: ShortcutType } = webShortcuts;

export const switchToDesktopShortcuts = (): void => {
  shortcuts = desktopShortcuts;
};

export const SHORTCUT_GROUP_ORDER = ['editor', 'tabs', 'grid', 'app'] as const;
