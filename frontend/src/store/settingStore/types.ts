export type SettingStore = {
  sidebar: SidebarType;
  updateSidebar(sidebar: Partial<SidebarType>): void;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
};
