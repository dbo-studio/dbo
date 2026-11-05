import type { AiChatMode } from '@/types';
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
  /** Full-window agent workspace over the main app; never persisted. */
  agentWorkspaceOpen: boolean;
  showAddConnection: boolean;
  duplicateConnectionId?: number;
  showEditConnection: number | boolean;
  showQuickLookEditor: boolean;
  showConnectionPasswordPrompt: boolean;
  passwordPromptConnectionId?: number;
  titleBar: TitleBarType;
  bottomPanel: BottomPanelType;
  /** Width the user dragged the Browse key list to. */
  browseListWidth: number;
};

/** VS Code-style panel under the editor tabs: terminal and query history. */
export type BottomPanelType = {
  open: boolean;
  tab: 'terminal' | 'history';
  height: number;
};

export type ThemeSettings = {
  isDark: boolean | undefined;
  appFont: string;
  editorFont: string;
  editorTheme: 'github-light' | 'github-dark';
  editorFontSize: number;
  themeName: string;
};

export type AiToolDensity = 'compact' | 'balanced' | 'detailed';

export type EditorSettings = {
  enableEditorAi: boolean;
  scrollToBottom: boolean;
  aiChatMode?: AiChatMode;
  aiWhatsNewSeen?: boolean;
  aiChatDensity?: 'comfortable' | 'compact';
  /** How much of the agent's tool activity the chat shows, like Cursor's tool call density. */
  aiToolDensity?: AiToolDensity;
  /** Max width of the workstation conversation. */
  aiChatWidth?: 'narrow' | 'default' | 'wide';
  /** Widths the user dragged the workstation's chat list and canvas to. */
  aiSessionsWidth?: number;
  aiCanvasWidth?: number;
};

export type GeneralSettings = {
  debug: boolean;
  enableErrorReporting: boolean;
  enableAnalytics: boolean;
  enableSafeModeBiometrics: boolean;
  ignoredRelease: string;
  logsPath: string;
  version: string;
  release: CheckUpdateResponseType | undefined;
  /** Seconds a query holds its request before it moves to the background; 0 keeps it in the request. */
  backgroundAfterSeconds: number;
  /** Desktop: closing the window hides DBO in the tray instead of quitting. */
  keepRunningInBackground: boolean;
  notifications: NotificationSettings;
};

export type NotificationSettings = {
  enabled: boolean;
  /** Tell the system (OS or browser) only while DBO is not in front; in front, a toast does it. */
  onlyWhenUnfocused: boolean;
  sound: boolean;
  query: boolean;
  import: boolean;
  export: boolean;
  /** Covers backup, restore and tool downloads. */
  backup: boolean;
};

export type SetupSettings = {
  hasCompletedSetup: boolean;
};

export type TitleBarType = {
  paddingLeft: number;
  paddingTop: number;
  draggable: boolean;
};

export type SidebarType = {
  showRight: boolean;
  rightWidth: number;
  showLeft: boolean;
  leftWidth: number;
  /** 0 = Assistant, 1 = Fields (data) or Source (diagram) */
  rightSidebarTab: number;
};
