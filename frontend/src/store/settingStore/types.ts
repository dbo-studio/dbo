export type SettingStore = {
  sidebar: SidebarType;
  isDark: boolean | undefined;
  debug: boolean;
  showAddConnection: boolean;
  showEditConnection: number | boolean;
  showQuickLookEditor: boolean;
  scrollToBottom: boolean;
  showSettings: boolean;
  updateSidebar(sidebar: Partial<SidebarType>): void;
  toggleIsDark(isDark?: boolean): void;
  toggleDebug(debug?: boolean): void;
  toggleShowAddConnection(show?: boolean): void;
  toggleShowEditConnection(show?: boolean | number): void;
  toggleShowQuickLookEditor(show?: boolean): void;
  toggleShowSettings(show?: boolean): void;
  toggleScrollToBottom(scroll?: boolean): void;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
};
