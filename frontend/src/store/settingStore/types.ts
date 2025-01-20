export type SettingStore = {
  sidebar: SidebarType;
  isDark: boolean | undefined;
  debug: boolean;
  updateSidebar(sidebar: Partial<SidebarType>): void;
  updateIsDark(isDark: undefined | boolean): void;
  updateDebug(debug: boolean): void;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
};
