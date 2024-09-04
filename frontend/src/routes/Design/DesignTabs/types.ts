import type { IconTypes } from '@/components/base/CustomIcon/types';

export type DesignTabTypes = {
  id: number;
  name: string;
  icon: keyof typeof IconTypes;
  iconActive: keyof typeof IconTypes;
  component: JSX.Element;
};

export type DesignTabItemProps = {
  tab: DesignTabTypes;
  onClick: (tab: DesignTabTypes) => void;
  selected: boolean;
};

export type DesignTabItemStyledProps = {
  selected: boolean;
};
