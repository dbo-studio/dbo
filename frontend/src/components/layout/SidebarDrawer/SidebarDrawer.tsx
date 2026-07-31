import { SidebarDrawerStyled } from './SidebarDrawer.styled';
import type { SidebarDrawerProps } from './types';

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
