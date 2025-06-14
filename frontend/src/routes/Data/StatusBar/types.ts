import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { TabMode } from '@/core/enums';

export type StatusBarTabTypes = {
  id: number;
  name: string;
  link: TabMode;
  icon: keyof typeof IconTypes;
  iconActive: keyof typeof IconTypes;
};

export type StatusBarStylesProps = {
  mode?: TabMode;
};
