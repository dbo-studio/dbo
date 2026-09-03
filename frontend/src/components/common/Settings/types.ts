import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { JSX } from 'react';

export type MenuPanelItemProps = {
  name: string;
  selected: boolean;
  icon: keyof typeof IconTypes;
  onClick: () => void;
};

export type MenuPanelItemStyledProps = {
  selected?: boolean;
};

export type MenuPanelProps = {
  tabs: MenuPanelTabType[];
  onChange: (tab: MenuPanelTabType | undefined) => void;
  defaultTab?: MenuPanelTabType;
};

export type MenuPanelTabType = {
  id: number;
  name: string;
  description?: string;
  onlyDesktop: boolean;
  icon: keyof typeof IconTypes;
  content: JSX.Element;
};

export type ThemeItemStyledProps = {
  selected?: boolean;
};

export type ThemeItemProps = {
  isDark: boolean;
  selected: boolean;
  onClick: () => void;
};

export type SettingsProps = {
  open: boolean;
  tab?: number;
};

export type AiSettingsTab = 'providers' | 'mcp';

export type AiPanelProps = {
  initialTab?: AiSettingsTab;
};
