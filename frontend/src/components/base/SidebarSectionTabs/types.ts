export type SidebarSectionTab<T extends string | number = number> = {
  id: T;
  label: string;
};

export type SidebarSectionTabsProps<T extends string | number = number> = {
  value: T;
  onChange: (value: T) => void;
  tabs: SidebarSectionTab<T>[];
  'aria-label'?: string;
};
