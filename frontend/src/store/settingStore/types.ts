export type SettingStore = {
  sidebar: SidebarType;
  isDark: boolean | undefined;
  debug: boolean;
  version: string;
  showAddConnection: boolean;
  showEditConnection: number | boolean;
  showQuickLookEditor: boolean;
  scrollToBottom: boolean;
  showSettings: boolean;
  enableEditorAi: boolean;
  updateSidebar(sidebar: Partial<SidebarType>): void;
  toggleIsDark(isDark?: boolean): void;
  toggleDebug(debug?: boolean): void;
  toggleShowAddConnection(show?: boolean): void;
  toggleShowEditConnection(show?: boolean | number): void;
  toggleShowQuickLookEditor(show?: boolean): void;
  toggleShowSettings(show?: boolean): void;
  toggleScrollToBottom(scroll?: boolean): void;
  toggleEnableEditorAi(enable?: boolean): void;
  updateVersion(version: string): void;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
};
