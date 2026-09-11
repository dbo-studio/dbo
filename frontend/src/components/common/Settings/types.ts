import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { SettingsNavGroup } from '@/core/settings/registry';
import type { JSX } from 'react';

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
  keywords?: string[];
  group?: SettingsNavGroup;
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

export type AiSettingsTab = 'providers' | 'mcp';

export type AiPanelProps = {
  initialTab?: AiSettingsTab;
};
