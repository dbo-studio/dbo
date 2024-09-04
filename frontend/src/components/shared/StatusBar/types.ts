import { TabMode } from '@/core/enums';
import { IconTypes } from '../../base/CustomIcon/types';

export type StatusBarTabTypes = {
  id: TabMode;
  name: string;
  link: string;
  icon: keyof typeof IconTypes;
  iconActive: keyof typeof IconTypes;
};

export type StatusBarStylesProps = {
  mode?: TabMode;
};
