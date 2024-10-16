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
