import type { TabMode } from '@/core/enums';
import type { IconTypes } from '../../base/CustomIcon/types';

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
