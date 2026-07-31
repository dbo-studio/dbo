export type SidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  anchor: 'left' | 'right';
  children: React.ReactNode;
};
