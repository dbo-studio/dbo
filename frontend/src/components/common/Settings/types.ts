import type { IconTypes } from '@/components/base/CustomIcon/types';

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
  onChange: (el: JSX.Element | undefined) => void;
};

export type MenuPanelTabType = {
  id: number;
  name: string;
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
