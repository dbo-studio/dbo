import type { CheckUpdateResponseType } from '@/api/config/types';

export type EditorContextByConnection = Record<string, { database: string; schema: string }>;

export type SettingStore = {
  ui: UISettings;
  theme: ThemeSettings;
  editor: EditorSettings;
  general: GeneralSettings;
  setup: SetupSettings;
  editorContextByConnection: EditorContextByConnection;

  updateUI: (ui: Partial<UISettings>) => void;
  updateTheme: (theme: Partial<ThemeSettings>) => void;
  updateEditor: (editor: Partial<EditorSettings>) => void;
  updateGeneral: (general: Partial<GeneralSettings>) => void;
  setEditorContextForConnection: (connectionId: string | number, context: { database: string; schema: string }) => void;
  clearEditorContextForConnection: (connectionId: string | number) => void;
  completeSetup(): void;
};

export type UISettings = {
  sidebar: SidebarType;
  showConnectionsDrawer: boolean;
  showAddConnection: boolean;
  duplicateConnectionId?: number;
  showEditConnection: number | boolean;
  showQuickLookEditor: boolean;
  showConnectionPasswordPrompt: boolean;
  passwordPromptConnectionId?: number;
  showSettings: {
    open: boolean;
    tab: number;
    aiTab?: 'providers' | 'mcp';
  };
  titleBar: TitleBarType;
};

export type ThemeSettings = {
  isDark: boolean | undefined;
  appFont: string;
  editorFont: string;
  editorTheme: 'github-light' | 'github-dark';
  editorFontSize: number;
  themeName: string;
};

export type EditorSettings = {
  enableEditorAi: boolean;
  scrollToBottom: boolean;
};

export type GeneralSettings = {
  debug: boolean;
  enableErrorReporting: boolean;
  enableAnalytics: boolean;
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
  onHeaderAreaClick: (event: MouseEvent) => void;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
  /** 0 = Assistant, 1 = Fields (data) or Source (diagram) */
  rightSidebarTab: number;
};
