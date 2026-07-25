import { SidebarDrawerStyled } from './SidebarDrawer.styled';

type SidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  anchor: 'left' | 'right';
  children: React.ReactNode;
};

export default function SidebarDrawer({ open, onClose, anchor, children }: SidebarDrawerProps) {
  return (
    <SidebarDrawerStyled
      anchor={anchor}
      open={open}
      onClose={onClose}
      variant='temporary'
      ModalProps={{ keepMounted: true }}
    >
      {children}
    </SidebarDrawerStyled>
  );
}
