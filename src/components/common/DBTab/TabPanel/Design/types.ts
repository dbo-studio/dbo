import { IconTypes } from '@/src/components/base/CustomIcon/types';
import { TabMode } from '@/src/types';

export type DesignTabTypes = {
  id: number;
  name: string;
  icon: keyof typeof IconTypes;
  iconActive: keyof typeof IconTypes;
  component: JSX.Element;
};

export type DesignStylesProps = {
  mode?: TabMode;
};
