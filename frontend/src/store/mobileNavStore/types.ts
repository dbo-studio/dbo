export type MobileTab = 'explore' | 'query' | 'ai';

export type MobileScreen = {
  name: string;
  params?: Record<string, string | number>;
};

export type MobileNavStore = {
  activeTab: MobileTab;
  stacks: Record<MobileTab, MobileScreen[]>;
  /** Connection switcher sheet opened from the header. */
  connectionsOpen: boolean;
  setConnectionsOpen: (open: boolean) => void;
  setActiveTab: (tab: MobileTab) => void;
  push: (screen: MobileScreen) => void;
  pop: () => boolean;
  resetTab: (tab: MobileTab) => void;
};
