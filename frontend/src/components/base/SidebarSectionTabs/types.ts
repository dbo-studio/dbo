import type { IconProps } from '@/components/base/CustomIcon/types';

export type SidebarSectionTab<T extends string | number = number> = {
  id: T;
  label: string;
  icon?: IconProps['type'];
  /** Shows a close button on the tab, for tabs the user opened. */
  onClose?: () => void;
  /** Extra data-* attributes, e.g. { testid: 'x', kind: 'y' } becomes data-testid and data-kind. */
  data?: Record<string, string>;
};

export type SidebarSectionTabsProps<T extends string | number = number> = {
  value: T;
  onChange: (value: T) => void;
  tabs: SidebarSectionTab<T>[];
  'aria-label'?: string;
};
