import type { CheckUpdateResponseType } from '@/api/config/types';

export type SettingStore = {
  ui: UISettings;
  theme: ThemeSettings;
  editor: EditorSettings;
  general: GeneralSettings;
  setup: SetupSettings;

  updateUI(ui: Partial<UISettings>): void;
  updateTheme(theme: Partial<ThemeSettings>): void;
  updateEditor(editor: Partial<EditorSettings>): void;
  updateGeneral(general: Partial<GeneralSettings>): void;
  completeSetup(): void;
};

export type UISettings = {
  sidebar: SidebarType;
  showAddConnection: boolean;
  showEditConnection: number | boolean;
  showQuickLookEditor: boolean;
  showSettings: {
    open: boolean;
    tab: number;
  };
  titleBar: TitleBarType;
};

export type ThemeSettings = {
  isDark: boolean | undefined;
  appFont: string;
  editorTheme: 'github-light' | 'github-dark';
  editorFontSize: number;
};

export type EditorSettings = {
  enableEditorAi: boolean;
  scrollToBottom: boolean;
};

export type GeneralSettings = {
  debug: boolean;
  enableErrorReporting: boolean;
  ignoredRelease: string;
  logsPath: string;
  version: string;
  release: CheckUpdateResponseType | undefined;
};

export type SetupSettings = {
  hasCompletedSetup: boolean;
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
