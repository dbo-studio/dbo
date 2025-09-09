import type { NewReleaseType } from '@/api/config/types';

export type SettingStore = {
  sidebar: SidebarType;
  isDark: boolean | undefined;
  debug: boolean;
  version: string;
  showAddConnection: boolean;
  showEditConnection: number | boolean;
  showQuickLookEditor: boolean;
  scrollToBottom: boolean;
  showSettings: {
    open: boolean;
    tab: number;
  };
  enableEditorAi: boolean;
  titleBar: TitleBarType;
  newReleaseVersion: {
    ignore: boolean;
    release: NewReleaseType | undefined;
  };
  updateSidebar(sidebar: Partial<SidebarType>): void;
  toggleIsDark(isDark?: boolean): void;
  toggleDebug(debug?: boolean): void;
  toggleShowAddConnection(show?: boolean): void;
  toggleShowEditConnection(show?: boolean | number): void;
  toggleShowQuickLookEditor(show?: boolean): void;
  toggleShowSettings(show?: boolean, tab?: number): void;
  toggleScrollToBottom(scroll?: boolean): void;
  toggleEnableEditorAi(enable?: boolean): void;
  updateVersion(version: string): void;
  updateTitleBar(titleBar: Partial<TitleBarType>): void;
  updateNewReleaseVersion(newReleaseVersion: NewReleaseType, ignore?: boolean): void;
};

export type TitleBarType = {
  paddingLeft: number;
  paddingTop: number;
  onHeaderAreaClick: () => void;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
};
